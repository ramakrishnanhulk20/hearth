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

## Why nobody can re-roll it

Three things, together.

1. **Closing succeeds once.** The draw state machine allows `closeDraw(p)` exactly once
   per draw. There is no second attempt to buy a better number.
2. **The value is unknown when it is drawn.** Since the seed is ciphertext at creation,
   whoever sends the closing transaction learns nothing from having sent it. There is no
   point in competing to be the caller.
3. **The publishing step is one-way.** After close, the seed is marked publicly
   decryptable. That flag is permanent and irrevocable on Zama's access control list, so
   the number the world sees is the number the contract committed to, not one chosen
   afterwards.

Compare that with the alternative designs. A draw fed by a block hash can be re-rolled by
a validator who does not like the result. A draw fed by an off-chain number can be chosen
outright. Neither is possible here, which is why the bounty asks for on-chain FHE
randomness and no off-chain generator.

## What becomes public, and when

| Value | Published when | Why it has to be public |
| --- | --- | --- |
| The seed `R` | At close, readable after the relayer decrypts it | Without it nobody can recompute a threshold |
| The pool's total weight `W` | At close | Thresholds are relative to the whole pool |
| The harvest for the draw | At close | It sets every prize size |
| Each tier's prize size and offered liquidity | At award | Needed to check what a win pays |
| The three tier remainders | At finalization | Needed to check how many prizes were paid |
| The unfunded counter | At finalization | Proves the pool funded every credit it wrote |

Everything on that list arrives after the period it decides has already ended. Publishing
`R` cannot help anyone change a weight, because weights for period `p` are frozen the
moment period `p` ends, which is before the draw can even be closed.

Each of those numbers reaches the contract with a signature from Zama's key management
service, verified on chain by `FHE.checkSignatures`. The proof is bound to the handles in
a fixed order, `[seed, aggregate, harvested]` at award and the three remainders in tier
order at reconciliation, so nothing can be shuffled between slots or replayed against a
different draw. The draw's state machine is the replay guard: each step succeeds once.

## How anyone recomputes a threshold

Everything below uses only public data. No wallet, no signature, no permission.

For draw `p`, saver address `u`, tier `t` with `count[t]` prizes and odds
`oddsNum[t] / oddsDen[t]`:

```
prn         = keccak256(abi.encode(R, p, u, t))
r           = uniform(prn, W)                                  // 0 <= r < W
threshold_k = floor((r + k * W) * oddsDen[t] / (oddsNum[t] * count[t]))
```

for each `k` from `0` to `count[t] - 1`. That saver won prize `k` if and only if their
time-weighted weight for period `p` was strictly greater than `threshold_k`.

A worked example with small numbers is in
[winner selection](../concepts/winner-selection.md). A filled example from a real Sepolia
draw is here:

| Field | Value |
| --- | --- |
| Draw | `{{DRAW_ID_EXAMPLE}}` |
| Seed `R` | `{{SEED_EXAMPLE}}` |
| Total weight `W` | `{{AGGREGATE_EXAMPLE}}` |
| Harvest | `{{HARVEST_EXAMPLE}}` |
| Tier prize sizes | `{{PRIZES_EXAMPLE}}` |
| Prizes paid per tier | `{{PAID_EXAMPLE}}` |

The app's verify panel does this arithmetic in the browser for any address you type in.
It has no privileged access; it is the same public inputs and the same formula.

## The bias of `uniform`

Reducing a big random number to a range with a plain remainder is biased. If `2^256` is
not an exact multiple of `W`, the low residues occur slightly more often, and that bias
lands unevenly on savers.

Rejection sampling removes it completely rather than bounding it:

```
min = (2^256 - W) % W
while prn < min:
    prn = keccak256(prn)
return prn % W
```

Discarding the first `min` values leaves exactly `2^256 - min` candidates, and that count
is an exact multiple of `W`. Every value from `0` to `W - 1` is then produced by exactly
the same number of inputs. **The bias is zero, not small.**

The cost is the loop, and it is not a real cost. The chance of even one rehash is
`min / 2^256`, which is below `W / 2^256`. The pool's total weight is held in a 128-bit
accumulator, so `W` is under `2^128` and the chance of a single extra hash is below one in
`2^128`. Every rehash is a plain keccak of the previous value, so anyone recomputing the
result gets the same answer.

This is the same approach PoolTogether V5 uses for the same reason. Our implementation is
written fresh, because theirs is GPL-3 licensed and this repository is MIT.

## Address grinding does not work

Once `R` is public, someone could generate addresses until they find one with a low
threshold. It would be useless. Thresholds are compared against a weight for period
`p`, and a brand new address has no observations at or before period `p`, so its weight
is zero. Zero beats no threshold. To have weight in period `p` you had to hold a balance
during period `p`, which was over before `R` existed.

Grinding for a future draw fails for the other reason: that draw's seed has not been
generated yet, and it is unpredictable.

## What verification proves, and what it does not

Being precise about this is the point of the page.

**It proves:**

- The seed was generated on chain, inside a transaction, under the network key, and
  published exactly once.
- The rule applied to every saver is public, uniform and recomputable by anyone.
- The prize sizes follow from the harvest and the tier parameters by public arithmetic.
- The number of prizes each tier paid matches what the tier offered minus what came back.
- The pool funded every credit the vault wrote, since the unfunded counter is published
  and is zero.

**It does not prove:**

- That the coprocessor's generator is uniform. That is Zama's engine, and it is trusted,
  not verified here.
- That the key management service signed the true plaintext of the seed handle. The
  contract checks the signature, not the semantics. A dishonest quorum could sign a value
  of its choosing. Every application on this protocol shares that assumption; it is
  attacker 8 in the [threat model](threat-model.md).
- That the published total `W` really is the sum of every saver's weight. An outsider
  cannot add up encrypted weights. What they have instead is that the same public,
  immutable code computed the aggregate and each saver's weight from the same
  observations, and that the conservation invariants hold: paid equals credited, and
  nobody withdraws more than principal plus winnings.
- Anything about who won. That is the whole point, and it is why publishing more would
  make verification stronger and the product worse.

## What a saver can check that nobody else can

A saver can go one step further than an outsider, because they can decrypt their own
weight and their own credit for a draw.

1. Reveal your weight for draw `p`.
2. Recompute your own thresholds from the public `R` and `W`.
3. Count how many you beat, multiply by the tier's prize size.
4. Reveal your credit for draw `p` and check it matches.

If it does not match, either a tier ran out before you were evaluated, which is the
documented clamp, or something is wrong and you have the numbers to prove it. The app
does all four steps for you and shows the arithmetic.
