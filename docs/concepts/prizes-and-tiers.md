# Prizes and tiers

Yield comes in as one lump every period. Tiers are how that lump becomes a mix of small
frequent prizes and a rare large one. This page explains the money side: how liquidity is
split, how a prize is sized, what happens when a tier pays out more than it planned for,
and the two places we deliberately differ from PoolTogether V5.

All of the arithmetic on this page is in plain numbers, not encrypted ones. Prize sizes,
tier liquidity and prize counts have always been public in PoolTogether, and they are
public here. What stays encrypted is who won.

## Liquidity and shares

Each tier holds a pot called its liquidity. Two things flow into it:

- **Harvests.** Every award splits the verified harvest across the tiers by their share
  weights. The integer remainder of that split, the few base units that do not divide
  evenly, goes to the grand tier rather than being dropped.
- **Reconciled remainders.** Whatever a tier offered in an earlier draw and did not pay
  out comes back at reconciliation.

At award time, for each tier:

```
prize[t]     = liquidity[t] * UTILISATION / count[t]
offered[t]   = liquidity[t]
liquidity[t] = 0        // until reconciliation returns the unpaid part
```

`UTILISATION` is 50 percent. That is PoolTogether's utilisation rate, and it is the whole
over-subscription defence: a tier offers all of its liquidity but sizes each prize as if
it only had half. A tier can therefore pay twice as many prizes as it expects to before
it runs dry.

Reconciliation happens after a draw's window closes, which is two periods later, so a
remainder can miss the very next award and be offered one draw after that instead.
Nothing is lost either way.

## The three Sepolia tiers

| Tier | Prizes per draw (`count`) | Odds | Shares | What it feels like |
| --- | --- | --- | --- | --- |
| Grand | 1 | 1 in 48 | 40 | Rare and large |
| Mid | 1 | 1 in 6 | 20 | A few times a day |
| Frequent | 4 | 1 in 1 | 40 | Four prizes every draw |

Total shares are 100, so the grand tier takes 40 percent of every harvest, the mid tier
20 percent and the frequent tier 40 percent. A period on Sepolia is 30 minutes, so 1 in
48 works out at about once a day and 1 in 6 at about once every three hours.

### What those settings produce

Write `H` for the harvest collected in one period. A tier's expected number of prizes per
draw is `count * odds`, because every saver's expected prizes add up to exactly the
tier's share of the whole pool. Feed that back into the sizing formula and each tier
settles at a steady state:

| Tier | Liquidity at rest | Prize size | Expected payout per draw | How often it fires |
| --- | --- | --- | --- | --- |
| Grand | 38.4 H | 19.2 H | 0.4 H | About once a day |
| Mid | 2.4 H | 1.2 H | 0.2 H | About every three hours |
| Frequent | 0.8 H | 0.1 H | 0.4 H (four prizes) | Every draw |

The three expected payouts add to exactly `H`. All of the yield goes out as prizes and
none of it accumulates forever.

To put a number on it, suppose the Sepolia source drips 10 USDC per period. Then the
grand prize sits near 192 USDC and lands about once a day, the mid prize near 12 USDC
several times a day, and four prizes of about 1 USDC land in every single draw. The live
drip rate is `{{SPONSOR_RATE}}` and the live prize sizes are on the app's draw panel,
read from the chain.

These are constructor arguments, chosen with PoolTogether V5's odds formula in the deploy
config. A mainnet deployment with a daily period would use different ones; see
[deploying](../operations/deploying.md).

## Over-subscription: when a tier pays more than it planned

Prizes are independent, so a tier that expects four prizes sometimes hands out six, or
nine. Each prize is one eighth of the frequent tier's liquidity, so it can pay eight of
them. Past that, the tier is empty.

Hearth handles this with an encrypted counter per tier per draw. Every payout is clamped
to the smaller of what the saver won and what the tier has left, and the counter drops by
the clamped amount. No transaction reverts, and nobody's arithmetic overflows.

### What a late winner experiences

Evaluation runs in saver-list order. If the tier empties partway through:

- The saver being evaluated at that moment gets whatever is left, which may be less than
  the prizes their thresholds say they won.
- Savers evaluated after them get nothing from that tier in that draw. Other tiers are
  unaffected: each tier has its own counter.

This is visible to the affected saver, not silent. Their stored weight and their stored
credit for that draw are both decryptable by them, so they can recompute their thresholds
from the public seed and see that their credit is short. A saver who wants to be early in
the queue can evaluate themselves as soon as the draw is awarded, because evaluation is
permissionless.

### How often it happens

For the frequent tier, with many small savers, the number of prizes handed out is close
to a Poisson distribution with mean 4, and the tier can pay 8. The chance of needing a
ninth is about 2 percent per draw. For the two tiers with `count = 1`, the expected
number of prizes is well below one while the capacity is still two, so the clamp is
rarer there by orders of magnitude.

That approximation assumes a pool of many small savers. In a pool of three savers with
very different sizes the spread is different, and in the small demo pool on Sepolia it is
easy to construct a draw that clamps. That is a feature of the demo's size, not a bug.

## Two deliberate differences from PoolTogether V5

Both are stated here rather than buried, because a reviewer who knows V5 will look for
them.

### 1. No reserve tier

V5 takes a share of every contribution into a reserve. The reserve funds the incentive to
award the draw, and it cushions a tier that is over-subscribed by topping it up.

Hearth has no reserve. The 50 percent utilisation rate is the only cushion, which is the
alternative V5's own documentation names for deployments that use
`tierLiquidityUtilizationRate` for this purpose. The consequence is the clamp described
above: in the rare over-subscribed draw, the last winners in evaluation order are short
rather than being topped up.

We chose this because a reserve needs an owner-controlled withdrawal path to be useful,
and every owner power in a confidential pool is a thing a saver has to trust. The
trade-off is written down in the [limitations list](../limitations.md) as limitation 4.

### 2. Grand odds are measured over one period

V5 measures the grand tier's odds over the tier's whole accrual window, so the chance of
taking a pot that has been building for a year reflects a year of participation.

Hearth measures grand odds over a single period, like every other tier. That means a
large holder who shows up for one period takes a full proportional shot at a pot that
other people spent 48 periods filling. It is a real asymmetry and it is stated as
limitation 5.

The cheap fix is known and noted for a later version: track balance-seconds accumulated
since the last grand payout, and weight the grand tier by that instead of by the single
period's weight. It was left out of version one because it adds a second accumulator with
its own overflow analysis, and shipping the simpler thing that is fully proven beat
shipping the better thing that is not.

## What this page does not cover

It does not cover where the harvest comes from or how it is verified, which is
[yield source](yield-source.md). It does not cover the per-saver test that decides who
wins, which is [winner selection](winner-selection.md). And it makes no privacy claim:
prize sizes and prize counts are public here by design.
