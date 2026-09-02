# The keeper

Draws do not happen by themselves. Something has to send the transactions. This page is
what that something does, what happens when it stops, and how much it costs.

The important framing first: the keeper has no privileges. Every function it calls is
callable by anyone. It is a convenience that saves savers the trouble, not a role the
pool depends on for safety.

## The job, in order, for draw `p`

1. **Close.** Call `closeDraw(p)` once period `p` has ended and while the window is open.
   This draws the encrypted seed, snapshots the encrypted aggregate weight of the period,
   harvests the yield source, and marks all three publicly decryptable.
2. **Fetch the proofs.** Ask Zama's relayer to publicly decrypt the three handles in the
   order `[seed, aggregate, harvested]`. The relayer returns the cleartexts with a
   signature from the key management service.
3. **Award.** Call `awardDraw(p, seed, aggregate, harvested, proof)`. The contract
   verifies the signature on chain, books the harvest into the tiers, and fixes each
   tier's prize size and offered liquidity. Winners are decided at this moment.
4. **Evaluate.** Call `evaluate(p, savers)` on the vault in batches of at most
   `{{MAX_BATCH}}`, walking the saver list in order. Skip savers whose first observation
   is after period `p`, since their weight is zero and the call would do nothing.
5. **Finalize.** After the window closes at the end of period `p+2`, call
   `finalizeDraw(p)`. This marks the three tier remainders and the unfunded counter
   publicly decryptable.
6. **Reconcile.** Fetch those cleartexts and call `reconcile(p, remaining, proof)`, which
   returns unpaid liquidity to the tiers.

## The ordering rule

**Reconcile draw `p` before awarding draw `p+1`, whenever possible.**

The reason is money, not correctness. Awarding a draw sizes its prizes from whatever
liquidity each tier holds at that moment. Reconciliation is what puts an earlier draw's
unpaid liquidity back. Reconcile first and that money is offered immediately; reconcile
after and it waits one more draw.

Nothing breaks if the order slips. A remainder reconciled after the next award is simply
offered one draw later. Nothing is lost either way.

Because a draw's window ends at the close of period `p+2`, and draw `p+1` can be awarded
during periods `p+2` and `p+3`, keeping the order means awarding `p+1` in period `p+3`.
The keeper does that when it can and does not stall when it cannot.

## What happens when the keeper is down

Nothing is lost. That is the whole answer, and it holds because of how a missed step is
handled:

| Missed step | Consequence |
| --- | --- |
| Close never happens | The draw stays in `None` and is skipped. Its liquidity was never offered, so it stays in the tiers and is offered next draw. |
| Award never happens inside the window | The draw stays `Closed` and is skipped. A late award still books the harvest and marks the draw `Skipped`, so no yield disappears. |
| Evaluation is incomplete | Savers who were not evaluated get nothing from that draw. Their unpaid liquidity comes back to the tiers at reconciliation. This is the one case where a real saver loses something they might have won, and it is limitation 2. |
| Finalize or reconcile is late | The tiers hold less liquidity for a while. It all comes back whenever somebody calls them. |

A stalled keeper costs the pool draws, not money. Deposits and withdrawals keep working
throughout, because the pause path never touches them and a stalled draw does not lock
anything.

Our previous deployment is the cautionary example: `openDraw` was permissionless and
nobody called it, so the live pool sat for 26 hours with a draw ready to be opened.
Permissionless is not the same as automated. That is why this design has a real keeper
and a redundancy path underneath it.

## How a saver advances a draw themselves

Every step above is permissionless, and the app exposes the ones a saver would want:

- **Advance draw.** Runs close, then fetches the decryption proofs in the browser, then
  awards. The relayer call is the same one the keeper makes, and the SDK does it from the
  page.
- **Evaluate me.** Runs `evaluate(p, [yourAddress])` for the draw currently open for
  evaluation. This is the button to press if you want to be early in the queue for an
  over-subscribed tier, or if a griefed saver list means the keeper's budget ran out
  before it reached you.
- **Evaluate a batch.** Runs the next `{{MAX_BATCH}}` savers in list order, for anyone
  who wants to help.

None of these need our permission, our keys or our servers to be up.

## Chainlink Automation, for the close step only

`HearthPrizePool` implements Chainlink's `checkUpkeep` and `performUpkeep` interface for
the close step. Registering a time-based upkeep gives the pool a second, independent way
to get draws closed on schedule.

It covers close and nothing else, and the reason is simple: close is the only step that
needs no off-chain data. Award needs a decryption proof fetched from Zama's relayer.
Evaluate needs a list of savers. Reconcile needs three more decryptions. An on-chain
automation network cannot fetch any of that, so pretending it could would be theatre.

The upkeep is optional. It needs LINK in a registered upkeep account, and it is
redundancy rather than the primary path. `{{CHAINLINK_UPKEEP_ID}}` records the
registration if one is live.

We declare the two-function interface locally instead of adding the whole Chainlink
contracts package and its dependencies for two selectors.

## The budget

Costs per draw, from the live deployment.

| Step | Transactions per draw | Gas each |
| --- | --- | --- |
| Close | 1 | `{{GAS_CLOSE}}` |
| Award | 1 | `{{GAS_AWARD}}` |
| Evaluate | `ceil(savers / {{MAX_BATCH}})` | `{{GAS_EVALUATE_BATCH}}` |
| Finalize | 1 | `{{GAS_FINALIZE}}` |
| Reconcile | 1 | `{{GAS_RECONCILE}}` |

At `{{SAVER_COUNT_EXAMPLE}}` savers that is `{{GAS_PER_DRAW}}` gas per draw, or about
`{{ETH_PER_DRAW}}` at `{{GAS_PRICE_ASSUMPTION}}`. On a 30-minute period that is
`{{ETH_PER_DAY}}` per day, and on a daily period `{{ETH_PER_DAY_MAINNET}}`.

Per-saver evaluation is `{{GAS_EVALUATE}}` gas and `{{HCU_EVALUATE}}` compute units. The
batch size `{{MAX_BATCH}}` is set from that measurement against Zama's published Sepolia
limits of 20,000,000 compute units per transaction with 5,000,000 in sequential depth,
with headroom rather than at the ceiling.

**The keeper caps its own spend.** Nothing on chain limits how much evaluation costs, so
the budget lives in the keeper's configuration. It evaluates in saver-list order and
stops when its per-draw budget is spent. The honest consequence is stated in the
[threat model](../security/threat-model.md): in a pool padded with worthless addresses, a
real saver near the end of the list may need to press "Evaluate me" inside the window.

## Running it

```
KEEPER_PRIVATE_KEY=...        # the account that sends the transactions
SEPOLIA_RPC_URL=...
RELAYER_URL=...               # Zama's relayer for the network
POOL_ADDRESS={{ADDRESS_POOL}}
VAULT_ADDRESS={{ADDRESS_VAULT}}
MAX_GAS_PER_DRAW=...          # the self-imposed evaluation budget
```

The keeper is stateless between ticks: it reads the draw state from the chain and works
out what to do. Restarting it loses nothing. It is safe to run two of them; the second
one's redundant calls revert or no-op, because every step succeeds exactly once per draw.

## What this page does not cover

It does not cover what the keeper's transactions actually do to the money, which is
[how a draw works](../concepts/how-a-draw-works.md). It does not cover deploying, which
is [deploying](deploying.md). And it makes no availability promise: we run a keeper, we
do not guarantee it, and the design is built so that not guaranteeing it is acceptable.
