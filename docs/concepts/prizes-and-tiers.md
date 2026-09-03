# Prizes and tiers

Yield comes in as one lump every period. Tiers are how that lump becomes a mix of small
frequent prizes and a rare large one. This page explains the money side: how liquidity is
split, how a prize is sized, what happens when a tier pays out more than it planned for,
and the three places we deliberately differ from PoolTogether V5.

Prize sizes, tier liquidity and prize counts have always been public in PoolTogether, and
the plaintext part of all three is public here. What stays encrypted is who won, and one
running total per tier called the carry.

## Liquidity and shares

Each tier holds a pot called its liquidity, in plain numbers anyone can read. Two things
flow into it:

- **Harvests.** Every award splits the verified harvest across the tiers by their share
  weights. The integer remainder of that split, the few base units that do not divide
  evenly, goes to the grand tier rather than being dropped. A harvest booked at the award
  of draw `p` is offered at the next close, not at draw `p`'s own.
- **Reconciled carry.** Whatever a tier offered in an earlier draw and nobody won comes
  back when that tier reconciles, which on Sepolia is one draw later.

Each tier also holds a second pot, the **carry**, and that one is encrypted. It is the
running total of everything the tier offered and nobody won, and it is added to the tier's
offer at every close even though its size is secret.

At close, for each tier:

```
prize[t]     = liquidity[t] * UTILISATION / count[t]     // plaintext only
offered[t]   = liquidity[t] + carry[t]                   // plaintext plus encrypted
liquidity[t] = 0                                         // until the tier reconciles
```

Two things to read out of that. Prize sizes come from the plaintext part alone, which is
what keeps them public. The encrypted carry only ever adds capacity, so a tier is always
at least as able to pay as its public prize size suggests.

`UTILISATION` is 50 percent. That is PoolTogether's utilisation rate, and it is the
over-subscription defence: a tier offers all of its liquidity but sizes each prize as if
it only had half. A tier can therefore pay twice as many prizes as it expects to before it
runs dry.

**All of this is fixed at close, before the random seed for that draw exists.** The seed
is drawn later in the same transaction. Nobody can see a seed, work out that they won, and
then move money between tiers to make the win bigger.

## The three Sepolia tiers

| Tier | Prizes per draw (`count`) | Odds | Shares | Reconciles every | What it feels like |
| --- | --- | --- | --- | --- | --- |
| Grand | 1 | 1 in 24 | 40 | 1 draw | Rare and large |
| Mid | 1 | 1 in 6 | 20 | 1 draw | A few times a day |
| Frequent | 4 | 1 in 1 | 40 | 1 draw | Four prizes every draw |

Total shares are 100, so the grand tier takes 40 percent of every harvest, the mid tier 20
percent and the frequent tier 40 percent. A period on Sepolia is one hour, so 1 in 24
works out at about once a day and 1 in 6 at about every six hours. Every tier reconciles
every draw, which is a choice with a cost on both sides; it has its own section below.

### What those settings produce

Write `H` for the harvest collected in one period. A tier's nominal expected number of
prizes per draw is `count * odds`. Feed that back into the sizing formula and each tier
settles at a steady state:

| Tier | Liquidity at rest | Prize size | Expected payout per draw | How often it fires |
| --- | --- | --- | --- | --- |
| Grand | 19.2 H | 9.6 H | 0.4 H | About once a day |
| Mid | 2.4 H | 1.2 H | 0.2 H | About every six hours |
| Frequent | 0.8 H | 0.1 H | 0.4 H (four prizes) | Every draw |

The three expected payouts add to exactly `H`. All of the yield goes out as prizes and
none of it accumulates forever.

Those are the nominal figures. The draw runs against the bracket `M` rather than the exact
total `W`, and `M` sits between `W` and `2W`, so a tier actually pays between half and all
of its nominal prize count each draw. See
[winner selection](winner-selection.md). What it does not pay goes into the carry and is
offered again, so nothing is lost; what happens instead is that prize sizes settle
somewhere between the figures above and twice them, depending on where the pool's total
sits inside its bracket. A pool near the top of a bracket pays close to the table. A pool
that has just crossed a power of two pays fewer, larger prizes for a while.

One reason the table describes the live deployment rather than an ideal: every tier
reconciles every draw. What a tier offered and nobody won is published at the finalize of
that draw and booked straight back into its public liquidity, so a tier's liquidity at rest
really does settle where the table says, and the pot the app shows is the pot the tier is
carrying. Under a slower cadence the same money would still be offered and still be
winnable, but it would sit in the encrypted carry between reconciles, and the public
liquidity, which is what sizes the prize, would be only the harvest booked since that
tier's last reconcile. The next section is that trade in full.

To put a number on it, suppose the Sepolia source drips 10 USDC per period. Then the grand
prize sits near 96 USDC and lands about once a day, the mid prize near 12 USDC about every
six hours, and four prizes of about 1 USDC land in every draw, with each of those figures
free to run up to twice as large depending on the bracket. The live drip rate is
`5,555 base units a second, which is 19.998 USDC a period` and the live prize sizes are in the "The pool right now" card on the dashboard at `/app`, read from the
chain.

These are constructor arguments, chosen with PoolTogether V5's odds formula in the deploy
config. A mainnet deployment with a daily period would use different ones; see
[deploying](../operations/deploying.md).

## The reconcile cadence, and what raising it costs

Reconciling a tier publishes its carry, and the carry is exactly the money that tier
offered and nobody won. Subtract it from what was offered, divide by the prize size, and
you know how many prizes that tier paid. That number is a real disclosure: it is a
measurement of the encrypted balances, of the form "how many of these savers had a weight
above their own published threshold".

`reconcileEvery[t]` is the dial on that disclosure, and it is a constructor argument per
tier. Raising it hides the count for that many draws and then publishes one number for the
whole span. Set the grand tier to 24 and its count becomes a daily figure, and the people
it could be are everybody who was eligible at any point in that day rather than the
roughly four percent of the pool eligible in a single draw. On a 1 in 24 tier that
difference is not cosmetic: a per-draw count names a jackpot winner out of a small set.

The price of raising it is the jackpot itself. A close moves all of a tier's public
liquidity into the draw and leaves the tier at zero, and that money only comes back at a
reconcile. So with a cadence of 24, on 23 draws out of every 24 the grand tier's public
liquidity is just the harvest booked since the last reconcile, the published prize is
sized off that one draw's share, and the accumulated pot shows up in the open only on the
reconcile draw. The money is not idle in the meantime, because the encrypted carry is
added to the tier's offer at every close and can be won throughout. It is invisible,
though, and a jackpot nobody can watch grow is not really a jackpot.

A hidden prize count and a visible, accumulating jackpot cannot both hold. **This
deployment chose the visible jackpot.** All three tiers run at `reconcileEvery = 1`, so
each tier's carry is published at the finalize of the draw it came from, verified on chain
against the handle the vault published, and booked back into public liquidity by
`reconcile`. The pot accumulates in the open, the way PoolTogether's does, and how many
prizes each tier paid becomes public one draw later, also the way PoolTogether's does.
Never who won, in either case.

That makes the count above a disclosed residual rather than a mitigated one. The reasoning
is unchanged and still true: a per-draw count on a 1 in 24 tier is a measurement over the
small set of savers eligible in that draw, and it accumulates against a balance that never
moves. It is written up in [what stays private](../security/what-stays-private.md) and
carried in the [limitations list](../limitations.md). Two things still limit it. The
counts are coarse, since nothing finer than a whole number of prizes is ever published.
And the thresholds cannot be aimed at a suspected balance, because the seed is drawn
inside the coprocessor and revealed only once its period is over.

A deployment that would rather have the slower measurement than the visible pot sets the
dial higher and takes the trade in the other direction. It is one redeploy.

## Over-subscription: when a tier pays more than it planned

Prizes are independent, so a tier that expects four prizes sometimes hands out six, or
nine. Each prize is one eighth of the frequent tier's liquidity, so it can pay eight of
them. Past that, the tier is empty.

Hearth handles this with an encrypted counter per tier per draw. Every payout is clamped
to the smaller of what the saver won and what the tier has left, and the counter drops by
the clamped amount. No transaction reverts, and nobody's arithmetic overflows.

### What a late winner experiences

Evaluation walks the saver list from a starting point derived from that draw's seed. If
the tier empties partway through the walk:

- The saver being evaluated at that moment gets whatever is left, which may be less than
  the prizes their thresholds say they won.
- Savers later in the walk get nothing from that tier in that draw. Other tiers are
  unaffected: each tier has its own counter.

Nobody can buy a better place in that queue. The walk order is fixed by the seed, the
caller of `evaluate` chooses how many savers to advance and never which ones, and the
starting point moves every draw, so no address is systematically last.

This is visible to the affected saver, not silent. Their stored weight and their stored
credit for that draw are both decryptable by them, so they can recompute their thresholds
from the public seed and see that their credit is short.

### How often it happens

For the frequent tier, with many small savers, the number of prizes handed out is close to
a Poisson distribution with mean 4, and the tier can pay 8. The chance of needing a ninth
is about 2 percent per draw. Because the draw runs against the bracket rather than the
exact total, the real expected count is between 2 and 4, so 2 percent is the ceiling
rather than the typical case. For the two tiers with `count = 1`, the expected number of
prizes is well below one while the capacity is still two, so the clamp is rarer there by
orders of magnitude.

That approximation assumes a pool of many small savers. In a pool of three savers with
very different sizes the spread is different, and in the small demo pool on Sepolia it is
easy to construct a draw that clamps. That is a feature of the demo's size, not a bug.

## Three deliberate differences from PoolTogether V5

All three are stated here rather than buried, because a reviewer who knows V5 will look
for them.

### 1. The draw runs against a bracket, not the exact total

V5 runs its winner test against the exact total supply for the draw, which it can do
because that number is public on a transparent chain. Publishing the exact total here
would leak individual deposit amounts, so Hearth publishes only the power-of-two bracket
above it.

The consequence is the one described above: a tier pays between half and all of its
nominal prize count each draw, and prize sizes settle correspondingly higher. No money is
lost and no saver's odds are distorted relative to any other saver's, because every saver
in a tier is scaled by the same `W / M`. It is limitation 12.

### 2. No reserve tier

V5 takes a share of every contribution into a reserve. The reserve funds the incentive to
award the draw, and it cushions a tier that is over-subscribed by topping it up.

Hearth has no reserve. The 50 percent utilisation rate is the only cushion, which is the
alternative V5's own documentation names for deployments that use
`tierLiquidityUtilizationRate` for this purpose. The consequence is the clamp described
above: in the rare over-subscribed draw, the last winners in walk order are short rather
than being topped up.

We chose this because a reserve needs an owner-controlled withdrawal path to be useful,
and every owner power in a confidential pool is a thing a saver has to trust. The
trade-off is written down in the [limitations list](../limitations.md) as limitation 4.

### 3. Grand odds are measured over one period

V5 measures the grand tier's odds over the tier's whole accrual window, so the chance of
taking a pot that has been building for a year reflects a year of participation.

Hearth measures grand odds over a single period, like every other tier. That means a large
holder who shows up for one period takes a full proportional shot at a pot that other
people spent 24 periods filling. It is a real asymmetry and it is stated as limitation 5.

The cheap fix is known and noted for a later version: track balance-seconds accumulated
since the last grand payout, and weight the grand tier by that instead of by the single
period's weight. It was left out of version one because it adds a second accumulator with
its own overflow analysis, and shipping the simpler thing that is fully proven beat
shipping the better thing that is not.

## What this page does not cover

It does not cover where the harvest comes from or how it is verified, which is
[yield source](yield-source.md). It does not cover the per-saver test that decides who
wins, which is [winner selection](winner-selection.md). And it makes no privacy claim
about prize sizes: those are public here by design, and what the published prize counts do
disclose is set out in [what stays private](../security/what-stays-private.md).
