# The keeper

Draws do not happen by themselves. Something has to send the transactions. This page is
what that something does, what happens when it stops, and how much it costs.

One process drives one pool. Hearth runs seven pools on Sepolia, so seven keeper processes
run, each signing from its own account of the same seed phrase and each pointed at one
pool's address file. The section "One keeper per pool" below is the table.

The important framing first: the keeper has no privileges. Every function it calls is
callable by anyone, and the two levers a keeper might have abused, choosing who gets
evaluated and choosing the payout order, are not levers any more. It is a convenience that
saves savers the trouble, not a role the pool depends on for safety.

## The job, in order, for draw `p`

1. **Close.** Call `closeDraw(p)` once period `p` has ended and before
   `closeDeadline(p)`, which is the middle of period `p+2`. Early in period `p+1` is the
   right habit. This fixes each tier's prize size and offered liquidity, moves that
   liquidity into the draw, draws the encrypted seed, asks the vault for the encrypted
   scale count and non-empty flag, harvests the yield source, and marks all four handles
   publicly decryptable.
2. **Fetch the proofs.** Ask Zama's relayer to publicly decrypt the four handles in the
   order `[seed, scaleCount, nonEmpty, harvested]`. The relayer returns the cleartexts
   with a signature from the key management service.
3. **Award.** Call `awardDraw(p, seed, scaleCount, nonEmpty, harvested, proof)`. The
   contract verifies the signature on chain, books the harvest into the tiers, and opens
   the draw. Winners are decided at this moment.
4. **Evaluate.** Call `evaluate(p, count)` on the vault, repeatedly, until the walk wraps
   back to where it started. Each call advances a per-draw cursor through the saver list
   from a start derived from the seed. The keeper picks `count`, never which addresses;
   `4` is the most savers needing encrypted work that fit in one transaction.
   Savers with no observation at or before period `p` are skipped by the contract itself,
   from plaintext timestamps, at no encrypted cost.
5. **Finalize.** After the window closes at the end of period `p+2`, call
   `finalizeDraw(p)`. This folds each tier's unpaid remainder into that tier's encrypted
   carry, publishes the unfunded counter, and marks the carry publicly decryptable for any
   tier that is due to reconcile, emitting `CarryPublished`.
6. **Reconcile, per due tier.** For each tier that `finalizeDraw` published, fetch the
   carry cleartext and call `reconcile(tier, carry, proof)`. The pool checks the proof against
   the handle the vault published, books the verified number into the tier's plaintext
   liquidity, the vault subtracts it from the carry (which may have grown since it was
   published), and `TierReconciled` is emitted.

On Sepolia every tier of every pool is due every draw, so step 6 runs up to three times
after each finalize. The cadence is a per-tier constructor argument and the keeper reads it from the
chain rather than assuming it, so a deployment that publishes a tier's carry less often
needs no keeper change. Why this one publishes all three every draw is in
[prizes and tiers](../concepts/prizes-and-tiers.md).

## The ordering rule

**Finalize and reconcile draw `p` at the start of period `p+3`, before closing draw
`p+2` in that same period.**

The reason is money, not correctness. A close sizes each tier's prizes from the tier's
plaintext liquidity at that moment, and reconciliation is what turns an earlier draw's
carry back into plaintext liquidity. Reconcile first and that money counts toward the
prize size immediately; reconcile after and it waits a draw.

Both jobs become available at the same instant. Draw `p`'s window ends at the end of
period `p+2`, and draw `p+2` becomes closable at the start of period `p+3`, so the keeper
does the finalize and any due reconciles first, then the close.

Nothing is lost if the order slips, but which way it slips matters. Close before the
finalize and the tier's carry is not pending yet, so `openDraw` folds it into the offer and
that money can still be won; it just does not raise the published prize size, which
`closeDraw` fixes from plaintext liquidity alone. Finalize, then close, then reconcile, and
the carry is pending: `openDraw` leaves a pending carry out of the draw entirely, so that
money is neither offered nor winnable until the reconcile clears the flag. On Sepolia every
tier is due at every finalize, so this is the ordinary case, and it is why the keeper reads
the carries again after its finalizes and reconciles before it closes. Nothing is lost
either way: the first close after a reconcile folds all of it back in.

## What happens when the keeper is down

Nothing is lost. That is the whole answer, and it holds because of how a missed step is
handled:

| Missed step | Consequence |
| --- | --- |
| Close never happens, or happens after `closeDeadline` and reverts | The draw stays `None` and is skipped. Its liquidity was never moved, so it stays in the tiers and is offered next draw. The harvest is collected by the next close. |
| Award never happens inside the window | A late award still books the harvest, still returns the offered liquidity to the tiers, and marks the draw `Skipped`. No yield and no liquidity disappear. |
| The walk does not reach every saver | Savers the walk missed get nothing from that draw. Their share of the offer folds into the tier's carry at finalization and is offered again. This is the one case where a real saver loses something they might have won, and it is limitation 2. |
| Finalize or reconcile is late | The tiers hold less plaintext liquidity for a while, so prize sizes are smaller. A carry that a finalize published and no reconcile has cleared sits out of every close until the reconcile lands. Nothing is lost: the first close after a reconcile folds all of it back in. |

A stalled keeper costs the pool draws, not money. Deposits and withdrawals keep working
throughout, because the pause path never touches them and a stalled draw does not lock
anything.

Our previous deployment is the cautionary example: `openDraw` was permissionless and
nobody called it, so the live pool sat for 26 hours with a draw ready to be opened.
Permissionless is not the same as automated. That is why this design has a real keeper and
a redundancy path underneath it.

## How a saver advances a draw themselves

Every step above is permissionless, and the app exposes every one of them on its "Run a
draw" screen, at `/app/<slug>/run` for the pool they are in, which is the sidebar row
marked "Anyone". A card at the top
names the step the pool is waiting for, and each of the five below it carries its own
button, off with a stated reason when it is not that step's turn:

- **Close**, then **Award.** Close fixes the prize sizes and draws the encrypted seed.
  Award fetches the four decryption proofs in the browser and sends the signed cleartexts
  back. The relayer call is the same one the keeper makes, and the SDK does it from the
  page.
- **Advance.** Runs `evaluate(p, count)` for the draw currently open, advancing the shared
  walk by a batch. The same call sits on your own draw card on "My draws" as "Advance the
  draw". This is the button to press if the keeper is down and the walk has not reached you
  yet. It does not let you pick yourself, and that is the feature: because nobody can single
  themselves out, sending this transaction says nothing about whether you won.
- **Finalize** and **Reconcile.** Runs the two closing steps for any draw whose window has
  ended.

None of these need our permission, our keys or our servers to be up.

## Chainlink Automation, for the close step only

`HearthPrizePool` implements Chainlink's `checkUpkeep` and `performUpkeep` interface for
the close step. Registering a time-based upkeep gives the pool a second, independent way to
get draws closed on schedule, and closing is the step with a deadline, so it is the one
worth insuring.

It covers close and nothing else, and the reason is simple: close is the only step that
needs no off-chain data. Award needs a decryption proof fetched from Zama's relayer.
Evaluate needs to be repeated until a cursor wraps. Reconcile needs another decryption. An
on-chain automation network cannot fetch any of that, so pretending it could would be
theatre.

The upkeep is optional. It needs LINK in a registered upkeep account, and it is redundancy
rather than the primary path, and it would be one upkeep per pool, each on that pool's own
schedule. None is registered on any of the seven yet, so the keepers alone run the demo
pools.

We declare the two-function interface locally instead of adding the whole Chainlink
contracts package and its dependencies for two selectors.

## The budget

Costs per draw, from the live deployment.

| Step | Transactions per draw | Gas each |
| --- | --- | --- |
| Close | 1 | `1,422,474` |
| Award | 1 | `435,578` |
| Evaluate, a full batch of 4 | `floor(savers / 4)`, here 1 | `3,417,699` |
| Evaluate, the last partial batch | 0 or 1, here 1 carrying one saver | `1,291,192` for one saver, plus `708,836` for each extra |
| Finalize | 1 | `509,463` |
| Reconcile | 3, one per tier, since every tier is due every draw | `459,994` |

At 5 savers that is `8,456,388` gas per draw, or about
`0.0085 ETH` at 1 gwei, the Sepolia base fee at deployment. On a one-hour period that is 24 draws a
day and `0.2030 ETH` per day; on a daily period it is `0.0085 ETH`.

Multiply that by seven pools and it is the whole reason six of them draw every six hours
rather than every hour. Hourly across all seven is 168 draws a day, about `1.43 ETH`, which
public faucets cannot keep up with. One hourly pool and six six-hour pools is 48 draws a
day, about `0.41 ETH`. Each keeper account is funded separately, so a pool that runs out of
gas stops only its own draws.

One more saver in a batch costs `708,836` gas on Sepolia, and a batch carrying a single
saver costs `1,291,192`, since the fixed part of the call is paid either way. In compute
units a saver is `3,674,128` on the mock coprocessor's price table, which is where that
figure is readable, because a live receipt does not report compute units. The
batch size `4` is set from that measurement against Zama's published Sepolia
limits of 20,000,000 compute units per transaction with 5,000,000 in sequential depth.
`evaluate` accepts any count, so if Zama reprices an operation the keeper can drop to a
smaller batch without a redeploy.

**The keeper evaluates the whole walk.** Nothing on chain limits how much evaluation costs,
and the keeper does not stop part way either; what it enforces is a fee ceiling
(`KEEPER_MAX_FEE_GWEI`), below which it keeps sending until the cursor reaches the end. The
honest consequence is stated in the [threat model](../security/threat-model.md): a pool
padded with worthless addresses costs the keeper more gas per draw, not the savers their
prizes, because addresses with no observation before the period are skipped without any
encrypted work. If the keeper is down, anyone can press "Advance", and because the walk
starts at a different point every draw, nobody sits permanently at the back.

## One keeper per pool

`packages/keeper/ecosystem.config.cjs` starts all seven under pm2, one process each. A
process is told which pool it drives by `HEARTH_ADDRESSES_FILE`, the address file that
pool's deploy wrote, which also gives it the token symbol, the decimals and the account
index to sign from. `KEEPER_NAME` is the tag every log line carries.

| pm2 process | `HEARTH_ADDRESSES_FILE` | `KEEPER_ACCOUNT_INDEX` |
| --- | --- | --- |
| `hearth-keeper-usdc` | `hearth.json` | 1 |
| `hearth-keeper-usdt` | `hearth.usdt.json` | 10 |
| `hearth-keeper-weth` | `hearth.weth.json` | 11 |
| `hearth-keeper-bron` | `hearth.bron.json` | 12 |
| `hearth-keeper-zama` | `hearth.zama.json` | 13 |
| `hearth-keeper-tgbp` | `hearth.tgbp.json` | 14 |
| `hearth-keeper-xaut` | `hearth.xaut.json` | 15 |

The `usdc` process points at `hearth.json` rather than `hearth.usdc.json` because that is
the file the first deployment wrote, before pools had slugs, and the running keeper has
been pointed at it for days. Both files carry the same addresses.

The indexes are spread out so a later pool can be added without renumbering, and each
account needs its own Sepolia ETH. Index 0 is the deployer and the keeper refuses it.

## Running it

The keeper is the `@hearth/keeper` package. It signs with one account of the same
`RECOVERY_PHRASE` the deploy uses and reads `SEPOLIA_RPC_URL` from
`packages/contracts/.env`; its own settings live in `packages/keeper/.env`:

```
HEARTH_ADDRESSES_FILE=../contracts/deployments/sepolia/hearth.weth.json
KEEPER_ACCOUNT_INDEX=11            # defaults to the index in the address file
KEEPER_NAME=weth                   # defaults to the slug in the address file
KEEPER_BATCH=4                     # savers of encrypted work per evaluate call
KEEPER_POLL_SECONDS=30
KEEPER_MAX_FEE_GWEI=20             # refuse to send above this
```

```
npm run compile -w @hearth/contracts    # the keeper reads the compiled ABI
npm run build -w @hearth/keeper
npm run plan -w @hearth/keeper          # one pass, simulates every call, sends nothing
npm run once -w @hearth/keeper          # one live pass
pm2 start packages/keeper/ecosystem.config.cjs   # all seven
pm2 logs hearth-keeper-weth                      # one pool
```

`plan` and `once` drive whichever pool `HEARTH_ADDRESSES_FILE` points at, so checking
another pool is one variable on the front of the command. If `HEARTH_VAULT` and
`HEARTH_POOL` are still sitting in `packages/keeper/.env` from a single-pool setup, take
them out: they are read before the address file, so all seven processes would drive one
pool.

A pass logs one line per fact, and every line is tagged with the pool the process drives,
so seven interleaved logs stay readable. Amounts carry that pool's own symbol and its own
decimals, both read from the address file:

```
09:14:37 [usdc] closed draw 41 (gas 1,422,474)
09:14:39 [usdc] draw 41: asking the relayer for the seed, the scale, the empty flag and the harvest
09:14:53 [usdc] awarded draw 41: 3 tiers, prizes 12.40 / 2.10 / 0.40 cUSDC, harvest 3.60 cUSDC (gas 435,578)
09:15:07 [usdc] evaluated draw 41: 4 of 9 savers done (gas 3,417,699)
09:15:38 [usdc] nothing to do: period 43, draw 41 has 8 of 9 savers evaluated
```

The WETH process prints the same lines under `[weth]`, in `cWETH`. What every kind of line
means, line by line, is in the keeper package's own README,
`packages/keeper/README.md`.

The keeper is stateless between ticks: it reads the draw state, the evaluation cursor and
the reconcile cadence from the chain and works out what to do. Restarting it loses
nothing. Run exactly one instance per pool, and never two on one account: on chain every
step succeeds exactly once per draw and per tier and two evaluate calls simply advance the
same cursor, but two keepers on one account race each other for the transaction nonce.

## What this page does not cover

It does not cover what the keeper's transactions actually do to the money, which is
[how a draw works](../concepts/how-a-draw-works.md). It does not cover deploying, which is
[deploying](deploying.md). And it makes no availability promise: we run a keeper, we do not
guarantee it, and the design is built so that not guaranteeing it is acceptable.
