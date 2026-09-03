# The keeper

Draws do not happen by themselves. Something has to send the transactions. This page is
what that something does, what happens when it stops, and how much it costs.

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

On Sepolia every tier is due every draw, so step 6 runs up to three times after each
finalize. The cadence is a per-tier constructor argument and the keeper reads it from the
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

Nothing breaks if the order slips. An unreconciled carry is still added to its tier's
offer at every close, so the money can still be won; it just does not raise the public
prize size until it is reconciled. Nothing is lost either way.

## What happens when the keeper is down

Nothing is lost. That is the whole answer, and it holds because of how a missed step is
handled:

| Missed step | Consequence |
| --- | --- |
| Close never happens, or happens after `closeDeadline` and reverts | The draw stays `None` and is skipped. Its liquidity was never moved, so it stays in the tiers and is offered next draw. The harvest is collected by the next close. |
| Award never happens inside the window | A late award still books the harvest, still returns the offered liquidity to the tiers, and marks the draw `Skipped`. No yield and no liquidity disappear. |
| The walk does not reach every saver | Savers the walk missed get nothing from that draw. Their share of the offer folds into the tier's carry at finalization and is offered again. This is the one case where a real saver loses something they might have won, and it is limitation 2. |
| Finalize or reconcile is late | The tiers hold less plaintext liquidity for a while, so prize sizes are smaller. The carry still adds capacity throughout, and it all comes back whenever somebody calls the two steps. |

A stalled keeper costs the pool draws, not money. Deposits and withdrawals keep working
throughout, because the pause path never touches them and a stalled draw does not lock
anything.

Our previous deployment is the cautionary example: `openDraw` was permissionless and
nobody called it, so the live pool sat for 26 hours with a draw ready to be opened.
Permissionless is not the same as automated. That is why this design has a real keeper and
a redundancy path underneath it.

## How a saver advances a draw themselves

Every step above is permissionless, and the app exposes every one of them in its "Run the
draw" panel:

- **Close**, then **Award.** Close fixes the prize sizes and draws the encrypted seed.
  Award fetches the four decryption proofs in the browser and sends the signed cleartexts
  back. The relayer call is the same one the keeper makes, and the SDK does it from the
  page.
- **Advance.** Runs `evaluate(p, count)` for the draw currently open, advancing the shared
  walk by a batch. The same call sits on your own draw card as "Advance the draw". This is
  the button to press if the keeper is down and the walk has not reached you yet. It does
  not let you pick yourself, and that is the feature: because nobody can single themselves
  out, sending this transaction says nothing about whether you won.
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
rather than the primary path. not registered yet, the keeper alone runs the demo pool records the registration if one is
live.

We declare the two-function interface locally instead of adding the whole Chainlink
contracts package and its dependencies for two selectors.

## The budget

Costs per draw, from the live deployment.

| Step | Transactions per draw | Gas each |
| --- | --- | --- |
| Close | 1 | `{{GAS_CLOSE}}` |
| Award | 1 | `{{GAS_AWARD}}` |
| Evaluate | `ceil(savers / 4)` | `{{GAS_EVALUATE_BATCH}}` |
| Finalize | 1 | `{{GAS_FINALIZE}}` |
| Reconcile | 3, one per tier, since every tier is due every draw | `{{GAS_RECONCILE}}` |

At 5 savers that is `{{GAS_PER_DRAW}}` gas per draw, or about
`{{ETH_PER_DRAW}}` at 1 gwei, the Sepolia base fee at deployment. On a one-hour period that is 24 draws a
day and `{{ETH_PER_DAY}}` per day; on a daily period it is `{{ETH_PER_DAY_MAINNET}}`.

Per-saver evaluation is `{{GAS_EVALUATE}}` gas and `{{HCU_EVALUATE}}` compute units. The
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

## Running it

The keeper is the `@hearth/keeper` package. It signs with account index 1 of the same
`RECOVERY_PHRASE` the deploy uses and reads `SEPOLIA_RPC_URL` from `packages/contracts/.env`;
its own settings live in `packages/keeper/.env`:

```
HEARTH_VAULT=0x0F93e5db6027b4FB1C76566d24aA2D2E417fAF52
HEARTH_POOL=0xA0785AacF30B6FE46EDc53CD8A9db1d94FeF5Df2
HEARTH_SOURCE=0xCC49DF69eAB6884fD8DD9260902B8A0Abc9D6b91   # optional, printed at boot
KEEPER_BATCH=4                     # savers of encrypted work per evaluate call
KEEPER_POLL_SECONDS=30
KEEPER_MAX_FEE_GWEI=20             # refuse to send above this
```

```
npm run compile -w @hearth/contracts    # the keeper reads the compiled ABI
npm run build -w @hearth/keeper
npm run plan -w @hearth/keeper          # one pass, simulates every call, sends nothing
npm run once -w @hearth/keeper          # one live pass
pm2 start packages/keeper/ecosystem.config.cjs
```

The keeper is stateless between ticks: it reads the draw state, the evaluation cursor and
the reconcile cadence from the chain and works out what to do. Restarting it loses
nothing. Run one instance per account: on chain every step succeeds exactly once per draw
and per tier and two evaluate calls simply advance the same cursor, but two keepers on one
account race each other for the transaction nonce.

## What this page does not cover

It does not cover what the keeper's transactions actually do to the money, which is
[how a draw works](../concepts/how-a-draw-works.md). It does not cover deploying, which is
[deploying](deploying.md). And it makes no availability promise: we run a keeper, we do not
guarantee it, and the design is built so that not guaranteeing it is acceptable.
