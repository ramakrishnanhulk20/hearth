# Winner selection

This is the heart of the product: deciding who won, over numbers nobody can read, in a
way a stranger can still check.

**The sentence that matters: winner selection is fixed at the draw, and evaluation only
writes it down.** The moment the pool verifies the random seed and the bracket the pool's
total falls in, every saver's result in every tier is already determined. The thresholds
are public numbers anyone can recompute, and the encrypted weight they are compared
against can no longer change. Evaluation is bookkeeping. It cannot be steered, front-run,
or skipped in a way that changes who won.

## What is fixed when a draw is awarded

| Symbol | What it is | Public? |
| --- | --- | --- |
| `R` | The random seed for this draw | Yes, after the period ends |
| `M` | The bracket the pool's total weight fell in, a power of two | Yes, after the period ends |
| `prize[t]` | What one prize in tier `t` pays | Yes, fixed at close |
| `offered[t]` | The liquidity tier `t` put up for this draw | Yes, fixed at close |
| `count[t]` | How many prizes tier `t` offers per draw | Yes, fixed at deployment |
| `odds[t]` | How often tier `t` fires, as a fraction | Yes, fixed at deployment |
| `W` | The pool's total time-weighted balance for the period | **No. Never published** |
| `twab` | One saver's time-weighted balance for the period | No, encrypted, readable by that saver |

The last two rows are the secrets. `twab` is per-person. `W` is the sum of every `twab`,
and it is kept back because publishing it exactly hands an observer a way to recover a
lone mover's deposit amount by subtraction. What the draw runs against instead is `M`:
the smallest power of two at or above `W`. So `M` sits somewhere between `W` and `2W`, and
the only thing an observer learns from one draw to the next is whether the pool crossed a
power of two.

## PoolTogether's rule, and ours

PoolTogether V5 gives each saver `count[t]` independent chances in tier `t`. Each chance
is won with probability `min(1, twab * odds[t] / W)`. So a saver's expected number of
prizes in a tier is their share of the pool, multiplied by the tier's odds, multiplied by
the number of prizes.

Doing that literally over encrypted numbers would mean drawing a fresh random number per
saver per prize, and it would need the exact `W`. Hearth reproduces the same shape with
one uniform random number per saver per tier, a ladder of nested thresholds, and `M` in
place of `W`.

Write `z = twab * odds[t] * count[t] / M`. That is the expected number of prizes this
saver wins in this tier. Hearth pays them `floor(z)` or `ceil(z)` prizes, capped at
`count[t]`, and the average across many draws is exactly `z`.

Because the denominator is `M` rather than `W`, every saver's expectation is scaled by
`W / M`, a number between one half and one. Add the savers up and a tier pays between half
and all of its nominal `count * odds` prizes per draw. Nothing is lost by that. What a
tier does not pay stays in its encrypted carry and is offered again at the next close, so
over time all of the yield still goes out; prize sizes simply settle higher. See
[prizes and tiers](prizes-and-tiers.md).

## The test, step by step

For a saver `u` in tier `t` of draw `p`:

1. Derive their random number for this tier. `prn = keccak256(R, p, u, t)`. Because the
   saver's address and the tier index go into the hash, every saver gets their own number
   and every tier gets a different one, all from the single seed `R`.
2. Reduce it to the bracket. `r = prn mod M`, a whole number from `0` to `M - 1`. `M` is a
   power of two, so this is a plain remainder of a 256-bit hash by a power of two, which
   is exactly uniform with no bias to correct. This is public arithmetic on public values.
3. Build the ladder. For each prize `k` from `0` to `count[t] - 1`:
   `threshold_k = floor((r + k * M) * oddsDen[t] / (oddsNum[t] * count[t]))`.
   These are public numbers. Anyone can compute them for any address, and the contract
   exposes the same arithmetic as a view, `thresholdOf(drawId, saver, tier, k)`, so the
   app's verify panel, the tests and a judge all use one implementation.
4. Compare. Prize `k` is won when the saver's encrypted weight is greater than
   `threshold_k`. This is the only step that touches a secret, and it is an encrypted
   comparison whose result is an encrypted true or false that nobody can read.
5. Pay. Each won prize adds `prize[t]` to the saver's encrypted payout for this tier, by
   an encrypted select rather than an if statement, so the transaction looks identical
   whether they won nothing or everything.
6. Clamp. The tier's payout to this saver is the smaller of what they won and what the
   tier has left. That subtraction updates the tier's encrypted remaining liquidity.
7. Credit. The clamped amount is added to the saver's encrypted winnings.

The thresholds rise with `k`, so a saver wins prizes `0` through `j-1` for some `j` and
then stops. The condition for prize `k` is exactly
`twab * odds * count > r + k * M`.

### The one plaintext branch

If a threshold is larger than `2^64 - 1`, no 64-bit weight can possibly beat it, so the
answer is false and the comparison is skipped entirely. This happens for a low-odds tier
when `M` is very large. Since thresholds only rise with `k`, the tier's loop stops at the
first such threshold rather than checking the rest. The branch is on a public number.
Nothing in Hearth ever branches on a secret.

## Worked example: three savers, one tier

A tiny pool, so the numbers stay readable. One tier: the frequent tier, `count = 4`,
`odds = 1` (that is, `oddsNum = 1`, `oddsDen = 1`). Weights are in USDC-seconds.

| Saver | Weight | Share of `W` | `z = weight * 4 / M` |
| --- | --- | --- | --- |
| Ada | 600 | 60% | 2.34 |
| Ben | 300 | 30% | 1.17 |
| Cy | 100 | 10% | 0.39 |
| **Total `W`** | **1,000** | 100% | **3.91** |

`W` is 1,000, so the bracket is `M = 1,024`, the smallest power of two at or above it.
Nobody outside the pool sees the 1,000. They see the 1,024.

Note the total column. The tier's nominal payout is `count * odds = 4` prizes per draw.
What it actually expects to pay is `4 * W / M = 4 * 1000 / 1024 = 3.91`. That is the
`W / M` scaling, and here it is a 2.3 percent haircut because 1,000 sits near the top of
its bracket. A pool of 520 would sit near the bottom of the same bracket and the tier
would expect about 2.03 prizes instead.

Now the draw happens. Each saver's `r` comes from hashing the seed with their own address,
so it is a different number for each of them, and it lands between 0 and 1,023.

**Ada, `r = 271`.** Thresholds are `floor((271 + k * 1024) / 4)`:

| k | Threshold | Ada's weight 600 beats it? |
| --- | --- | --- |
| 0 | 67 | Yes |
| 1 | 323 | Yes |
| 2 | 579 | Yes |
| 3 | 835 | No |

Ada wins 3 prizes. Her expectation was 2.34, so 3 is the high side of `floor` or `ceil`.

**Ben, `r = 812`.** Thresholds `floor((812 + k * 1024) / 4)`:

| k | Threshold | Ben's weight 300 beats it? |
| --- | --- | --- |
| 0 | 203 | Yes |
| 1 | 459 | No |

Ben wins 1 prize, against an expectation of 1.17.

**Cy, `r = 155`.** Thresholds `floor((155 + k * 1024) / 4)`:

| k | Threshold | Cy's weight 100 beats it? |
| --- | --- | --- |
| 0 | 38 | Yes |
| 1 | 294 | No |

Cy wins 1 prize. His expectation was 0.39, so this is his good day. Over many draws he
wins one prize about 39 percent of the time and nothing the rest.

Five prizes were handed out where 3.91 were expected. That is fine: each prize is one
eighth of the tier's liquidity, so the tier can pay eight before it runs dry. See
[over-subscription](prizes-and-tiers.md).

Now notice what an observer sees at the end of all that. They can compute all three tables
themselves, because `R`, `M`, the thresholds and the addresses are public. What they
cannot do is fill in the right-hand column, because the weights are encrypted, and they
cannot recover the 1,000 either, because only the 1,024 was published. After the tier
reconciles, one draw later, they learn how many prizes it paid. They never learn to whom.

## Why splitting your wallet gains nothing

This is the property that a badly built version loses.

A saver's expected prizes in a tier are `z = twab * odds * count / M`, which is linear in
their weight, and `M` does not depend on how the pool's weight is divided up between
addresses. Split a weight of 600 into two wallets of 300 and each gets `z = 1.17`, for a
total of 2.34. Exactly the same. Split into six wallets of 100 and each gets 0.39, total
2.34. Exactly the same again. There is no threshold to game and no rounding to farm, only
more gas to pay.

An earlier version of this design folded the prize count into a single wider winning zone
so each saver could win at most one prize per tier. That capped large holders below their
fair share and paid people for splitting up. A design review caught it and the nested
ladder replaced it.

## What it costs

Per saver per draw the encrypted work is: one multiply and one add to compute the weight,
then for each tier one comparison and one select per prize, plus a clamp. With the three
Sepolia tiers that is 6 comparisons, 6 selects and about a dozen adds, subtracts and
minimums.

Zama publishes the per-transaction budget on Sepolia as 20,000,000 compute units in total
with 5,000,000 in sequential depth, and prices a 64-bit add at 162,000, a comparison at
about 118,000, a select at 55,000 and a multiply by a public number at 365,000. Those
numbers put one saver in the low millions of compute units, which is why evaluation is
batched at `{{MAX_BATCH}}` savers per transaction. The measured figure is
`{{HCU_EVALUATE}}` per saver and the measured gas is `{{GAS_EVALUATE}}`.

## What this page does not cover

It does not cover where `R` comes from or how to verify it, which is
[randomness and verification](../security/randomness-and-verification.md). It does not
cover how `prize[t]` is sized or what happens when a tier runs out mid-draw, which is
[prizes and tiers](prizes-and-tiers.md). And it makes no claim about hiding who
participated: the saver list, the evaluation batches and the per-tier prize counts are
all public. See [what stays private](../security/what-stays-private.md).
