# Randomness and verification

A draw is only worth anything if a stranger can check it. This page is how.

## Where the seed comes from

One call, inside the transaction that closes a draw:

```solidity
euint64 seed = FHE.randEuint64();
```

That runs inside Zama's coprocessor. The number is produced by a cryptographically secure
generator under the network's FHE key, and what comes back to the contract is a ciphertext
handle, not a number. Nobody has seen the value at that moment: not the caller, not us,
not the miner.

Two properties of Zama's generator matter here, and both are stated in Zama's own
documentation:

- **It must run inside a transaction.** Generating a random value mutates the on-chain
  generator state, so it cannot be done through `eth_call`, the read-only way to simulate
  a call. Nobody can preview a draw off chain to see whether they would win.
- **It is cryptographically secure and stays encrypted** until something explicitly makes
  it decryptable.

## Why nobody can re-roll it, or resize what it wins

Four things, together.

1. **Closing succeeds once.** The draw state machine allows `closeDraw(p)` exactly once
   per draw. There is no second attempt to buy a better number.
2. **The value is unknown when it is drawn.** Since the seed is ciphertext at creation,
   whoever sends the closing transaction learns nothing from having sent it. There is no
   point in competing to be the caller.
3. **The publishing step is one-way.** After close, the seed is marked publicly
   decryptable. That flag is permanent and irrevocable on Zama's access control list, so
   the number the world sees is the number the contract committed to, not one chosen
   afterwards.
4. **The prizes are fixed before the seed exists.** Each tier's prize size and the
   liquidity it offers are computed at the top of the same closing transaction, before
   `randEuint64` is called. In an earlier draft they were set later, at the award, which
   left a window in which somebody could read the seed, work out that they had won, and
   then move liquidity between tiers to make that win worth more. That window is gone.

Compare that with the alternative designs. A draw fed by a block hash can be re-rolled by
a validator who does not like the result. A draw fed by an off-chain number can be chosen
outright. Neither is possible here, which is the whole reason the randomness is generated
on chain under encryption and never by an off-chain generator.

## What becomes public, and when

| Value | Published when | Why it has to be public |
| --- | --- | --- |
| The seed `R` | At close, readable after the relayer decrypts it | Without it nobody can recompute a threshold |
| The scale count, from which the bracket `M` follows | At close | Thresholds are relative to the size of the pool |
| Whether the period was non-empty | At close | Distinguishes an empty draw from a real one |
| The harvest for the draw | At close | It is the money that funds later prizes |
| Each tier's prize size and its plaintext offered liquidity | At close | Needed to check what a win pays |
| Each tier's carry | At the finalization of every draw, since every tier reconciles every draw | Needed to check how many prizes the tier paid |
| The unfunded counter | At finalization | Proves the pool funded every credit the vault wrote |

Two things are deliberately **not** on that list. The pool's exact total time-weighted
balance is never published, because doing so let an observer recover a lone mover's
deposit amount exactly; the bracket above it is published instead. And no per-saver value
is ever marked publicly decryptable.

Everything on the list arrives after the period it decides has already ended. Publishing
`R` cannot help anyone change a weight, because weights for period `p` are frozen the
moment period `p` ends, which is before the draw can even be closed.

Each of those numbers reaches the contract with a signature from Zama's key management
service, verified on chain by `FHE.checkSignatures`. The proof is bound to the handles in
a fixed order: `[seed, scaleCount, nonEmpty, harvested]` at award, and one carry handle per
reconciliation. Nothing can be shuffled between slots or replayed against a different
draw. The draw's state machine is the replay guard: each step succeeds once per draw, and
reconciliation once per tier.

## The bracket, and how the vault tracks it

The pool's total time-weighted balance for a period, `W`, stays encrypted. The number the
draw runs against is `M = 2^m`, the smallest power of two at or above `W`.

The vault tracks `m` from draw to draw rather than computing it from scratch. At each
close it compares `W` under encryption against the five powers of two around the previous
draw's `m`, adds the five results into one small encrypted count, and marks that count
publicly decryptable. The pool reads the verified count and works out the new `m`, which
can move by at most three steps per draw. A separate encrypted comparison against 1 gives
the non-empty flag.

So the public record per draw is one small integer, and it changes only when the pool
crosses a power of two. `scaleBits()` on the pool reads the current `m`; the deployment
seeds it with `initialScaleBits`, the expected bit length of the first period's total, and
the tracker corrects any error by up to three bits per draw.

## How anyone recomputes a threshold

Everything below uses only public data. No wallet, no signature, no permission.

For draw `p`, saver address `u`, tier `t` with `count[t]` prizes and odds
`oddsNum[t] / oddsDen[t]`:

```
prn         = keccak256(abi.encode(R, p, u, t))
r           = prn mod M                                        // 0 <= r < M
threshold_k = floor((r + k * M) * oddsDen[t] / (oddsNum[t] * count[t]))
```

for each `k` from `0` to `count[t] - 1`. That saver won prize `k` if and only if their
time-weighted weight for period `p` was strictly greater than `threshold_k`.

You do not have to reimplement it. The vault exposes
`thresholdOf(drawId, saver, tier, k)` as a pure view over the same arithmetic evaluation
uses, so the app's verify panel, the test suite and anyone with a block explorer all read
the same implementation. Reimplementing it off chain is four lines of big-integer
arithmetic if you would rather check the contract against your own code.

A worked example with small numbers is in
[winner selection](../concepts/winner-selection.md). A filled example from a real Sepolia
draw is here, taken from the `usdc` pool, whose prize pool is
`0xA0785AacF30B6FE46EDc53CD8A9db1d94FeF5Df2`. Every pool publishes the same fields for its
own draws:

| Field | Value |
| --- | --- |
| Draw | `2, the period from 23:00 to 00:00 UTC on 2 September 2026` |
| Seed `R` | `5625525180683981523` |
| Bracket `M` | `2^43, which is 8,796,093,022,208 balance-seconds` |
| Harvest | `19.531380 USDC` |
| Tier prize sizes | `3.559644 / 1.779822 / 0.889911 USDC, grand / mid / frequent` |
| Prizes paid per tier | `0 / 0 / 5, against a funded capacity of 2 / 2 / 8` |

Read from the chain: the seed and the bracket come from the pool's `DrawAwarded` event,
the prize sizes and the offered liquidity from `drawParams(2)`, and the prizes paid from the
three `TierReconciled` events for that draw, since what a tier offered and did not pay is
exactly the carry it published. The grand and mid tiers paid nothing in this draw and handed
their whole offer back, which is what a 1 in 24 and a 1 in 6 tier do most of the time.

The app's verify panel does this arithmetic in the browser for any address you type in, at
`/verify?pool=<slug>` for the pool you want. It has no privileged access; it is the same
public inputs and the same formula.

## Why the remainder is unbiased

Reducing a big random number into a range with a plain remainder is usually biased. If
`2^256` is not an exact multiple of the range, the low residues occur slightly more often,
and that bias lands unevenly on savers. PoolTogether V5 solves it with rejection sampling,
and so did an earlier draft of Hearth.

Hearth no longer needs to. `M` is a power of two by construction, and `2^256` is an exact
multiple of every power of two up to `2^256`. So `prn mod M` is simply the low `m` bits of
a 256-bit hash, and every value from `0` to `M - 1` comes from exactly the same number of
inputs. **The bias is zero, not small**, with no loop, no rejection and nothing for a
verifier to reproduce carefully.

That is a side benefit of publishing the bracket rather than the exact total, and it is
worth stating because it removes a piece of code that anybody checking the draw would
otherwise have to match exactly.

## Address grinding does not work

Once `R` is public, someone could generate addresses until they find one with a low
threshold. It would be useless. Thresholds are compared against a weight for period `p`,
and a brand new address has no observations at or before period `p`, so its weight is
zero. Zero beats no threshold. To have weight in period `p` you had to hold a balance
during period `p`, which was over before `R` existed.

Grinding for a future draw fails for the other reason: that draw's seed has not been
generated yet, and it is unpredictable.

## What verification proves, and what it does not

Being precise about this is the point of the page.

**It proves:**

- The seed was generated on chain, inside a transaction, under the network key, and
  published exactly once.
- The prize sizes and offered liquidity were fixed before that seed existed.
- The rule applied to every saver is public, uniform and recomputable by anyone.
- The prize sizes follow from the tier liquidity and the tier parameters by public
  arithmetic.
- The number of prizes each tier paid matches what the tier offered minus what came back
  in its carry.
- The pool funded every credit the vault wrote, since the unfunded counter is published
  and is zero.

**It does not prove:**

- That the coprocessor's generator is uniform. That is Zama's engine, and it is trusted,
  not verified here.
- That the key management service signed the true plaintext of the seed handle. The
  contract checks the signature, not the semantics. A dishonest quorum could sign a value
  of its choosing. Every application on this protocol shares that assumption; it is
  attacker 8 in the [threat model](threat-model.md).
- That the published bracket really is the bracket of the sum of every saver's weight. An
  outsider cannot add up encrypted weights, and now cannot see the sum either. What they
  have instead is that the same public, immutable code computed the comparisons and each
  saver's weight from the same observations, and that the conservation invariants hold:
  paid equals credited, and nobody withdraws more than principal plus winnings.
- Anything about who won. That is the whole point, and it is why publishing more would
  make verification stronger and the product worse. Publishing the exact total is the
  concrete example: it made the pool's size checkable, and it also made a lone mover's
  deposit recoverable to the base unit.

## What a saver can check that nobody else can

A saver can go one step further than an outsider, because they can decrypt their own
weight and their own credit for a draw.

1. Reveal your weight for draw `p`.
2. Recompute your own thresholds from the public `R` and `M`, or read them from
   `thresholdOf`.
3. Count how many you beat, multiply by the tier's prize size.
4. Reveal your credit for draw `p` and check it matches.

If it does not match, either a tier ran out before the walk reached you, which is the
documented clamp, or something is wrong and you have the numbers to prove it. The app does
all four steps for you and shows the arithmetic.
