# Pools and tokens

Hearth is not one pool. It is seven, one per confidential token on Zama's Sepolia address
book, and each one is its own `HearthVault`, its own `HearthPrizePool` and its own
`SponsoredYieldSource`, with its own savers, its own prize money and its own keeper.

The contracts are the same code, deployed seven times with different constructor
arguments. Nothing is shared on chain: no registry, no router, no shared balance. A saver
in the WETH pool cannot see, touch or be touched by the USDC pool, and a paused vault or a
stalled keeper on one token leaves the other six running.

## The seven pools

| Token | Slug | Draw every | Vault | Prize pool | Yield source |
| --- | --- | --- | --- | --- | --- |
| Confidential USDC (Mock) | `usdc` | 1 hour | `0x0F93e5db6027b4FB1C76566d24aA2D2E417fAF52` | `0xA0785AacF30B6FE46EDc53CD8A9db1d94FeF5Df2` | `0xCC49DF69eAB6884fD8DD9260902B8A0Abc9D6b91` |
| Confidential USDT (Mock) | `usdt` | 6 hours | `0xe54F44dE64F8A7abc0647eaae547dD59ce0EFfac` | `0x6a83Beb2Dc3f258107Cad5e17BC57657fAd4fbd1` | `0x5bb1Cd5380Cb9f2B15569030fF0dB7a445cF54cA` |
| Confidential WETH (Mock) | `weth` | 6 hours | `0x3D1A182782B68fE270A66294C9adaC7F005c4f14` | `0x1a11e7C689F244fA8Dd5f4abA8F2F3131090cc1C` | `0x40DF298f15c6136294eC651aD7b0c1C6F221DE8F` |
| Confidential BRON (Mock) | `bron` | 6 hours | `0x18086DC8271f8A73c5Ea985fd519527Dbb991279` | `0x2Ed982979CD184494B947a1E38E597494a38ACe4` | `0x0cD1155D752bD81b3a437a6f0B3965CAA2A1C8e9` |
| Confidential ZAMA (Mock) | `zama` | 6 hours | `0xEEC26386F273c6678cA538AcA18e1d9384eA9F09` | `0x873B285404199D46325a294Aa0EC7a79C30A7fF7` | `0xdD352D70311E834ab75307f53d5C276060081d23` |
| Confidential tGBP (Mock) | `tgbp` | 6 hours | `0xCe95dAa01f5354aA8887A5952E403D26d452c323` | `0xC531D54ee2c695e0eBfe8b8258e9Fd80fd507095` | `0xDEa2BD6351072F735B6ea83c357bF157d83c01af` |
| Confidential XAUt (Mock) | `xaut` | 6 hours | `0x77f701101d66FbD522A3bFdC2c00DB09a4F57daE` | `0x9a2888aca42c707A3BC0D561FdF6ff8Abfda5201` | `0x03fDdAA7C4323C53CE511CC49D4c33B26B492af7` |

Every contract above is verified on Etherscan. The token pair each pool holds is Zama's,
not ours, and is listed in [try it on Sepolia](../getting-started/try-it-on-sepolia.md).

The USDC pool was deployed first, on 2 September 2026 in block `11622398`, and has run
hourly draws ever since, which is why it is the pool with a history behind it and the pool
the prove-it transcript in the README was recorded against. The other six were deployed on
5 September 2026, in blocks `11641314` through `11641523`.

## Why six hours, and not an hour for all seven

Gas. One draw on a five-saver pool is `8,456,388` gas measured on live Sepolia receipts:
a close, an award, two evaluation batches, a finalize and one reconcile per tier. At 1
gwei that is `0.0085 ETH`. Seven pools drawing every hour would be 168 draws a day, about
`1.43 ETH`, which cannot be kept funded from public faucets through a judging window. A
ten-saver pool is `12,582,923` gas a draw and the bill grows with it.

So the six pools deployed later draw every six hours. That is four draws a day each, so
all seven pools together cost about `0.41 ETH` a day instead of `1.43`, and four draws a
day is still often enough that a visitor sees one land inside a single visit. The USDC
pool keeps its hourly clock and the draws of history that came with it.

The odds are set against each pool's own period rather than carried over, so the feel of
the product is the same on both clocks:

| Tier | Hourly pool (`usdc`) | Six-hour pools |
| --- | --- | --- |
| Grand | count 1, odds 1 in 24, shares 40 | count 1, odds 1 in 4, shares 40 |
| Mid | count 1, odds 1 in 6, shares 20 | count 1, odds 1 in 2, shares 20 |
| Frequent | count 4, odds 1 in 1, shares 40 | count 4, odds 1 in 1, shares 40 |

The grand prize therefore pays about once a day in every pool. The mid tier is the one
place the two clocks differ: about four times a day on the hourly pool and about twice a
day on the six-hour ones, because halving the odds does not quite make up for a sixth as
many draws. Every tier of every pool reconciles every draw, for the reason in
[prizes and tiers](prizes-and-tiers.md).

## Decimals, and what an amount means

Every confidential wrapper on Zama's Sepolia address book reads six decimals, whatever the
public token underneath reads, because the wrapper caps itself at six and charges the
difference to its `rate()`. Confidential WETH is the clearest case: its underlying holds
18 decimals, so the wrapper's `rate()` is a million million, and one base unit of the
wrapper is a million million base units of the public token.

Every amount in `packages/contracts/hearth.config.ts` is in wrapper base units, and the
deploy and the tasks multiply by the rate they read on chain before they touch the public
token. This is not a detail. Our own audit found a bug where a pool booked the amount a
caller passed in rather than the amount the wrapper minted, which on an 18-decimal token
inflated prize money by a factor of a million million. See
[yield source](yield-source.md).

## What each pool is seeded with

`hearth:seed --token <slug>` sponsors the yield source and puts five demo savers in, from
account indexes 2 to 6, so a first visitor lands on a populated pool. The stakes differ per
token because a pool has to look like the asset it holds: 1,200 of a dollar stablecoin and
0.6 of ether are the same size of saver.

| Pool | Five demo stakes | Sponsorship | Prize money released |
| --- | --- | --- | --- |
| `usdc` | 1,200 / 600 / 300 / 150 / 75 | 10,000 USDC | 20 USDC an hour, so 19.998 a draw |
| `usdt` | 1,200 / 600 / 300 / 150 / 75 | 10,000 USDT | 20 USDT an hour, so 119.98 a draw |
| `weth` | 0.6 / 0.3 / 0.15 / 0.075 / 0.04 | 5 WETH | 0.01 WETH an hour, rounded down to 0.0432 a draw |
| `bron` | 2,000 / 1,000 / 500 / 250 / 125 | 15,000 BRON | 30 BRON an hour, so 179.99 a draw |
| `zama` | 2,000 / 1,000 / 500 / 250 / 125 | 15,000 ZAMA | 30 ZAMA an hour, so 179.99 a draw |
| `tgbp` | 1,000 / 500 / 250 / 125 / 60 | 8,000 tGBP | 16 tGBP an hour, so 95.99 a draw |
| `xaut` | 0.4 / 0.2 / 0.1 / 0.05 / 0.025 | 3 XAUt | 0.006 XAUt an hour, rounded down to 0.0216 a draw |

A source's rate is whole base units a second, so the two smallest rates are rounded down:
0.01 WETH an hour is 2.77 base units a second and releases 2, and 0.006 XAUt an hour is
1.67 and releases 1. Every sponsorship is sized to last more than eighty draws, which is
twenty days or more, so nobody has to top a pool up during a judging window.

## The token Hearth refuses

Zama also publishes a non-mock **Confidential tGBP** on Sepolia, at
`0x167DC962808B32CFFFc7e14B5018c0bE06A3A208` over the public token
`0xf6Ef9ADB61A48E29E36bc873070A46A3D2667ff3`. Its underlying mint is restricted to the
issuer, so nobody but the issuer can obtain the public token, nobody can wrap into the
confidential one, and no pool can be opened on it at all.

Hearth lists it in the pool picker anyway, greyed out, with the reason written next to it:
`mint restricted to the issuer`. Choosing it opens a page that names the token, links both
contracts on Etherscan, says whose restriction it is, and offers no wallet action, because
a deposit button that reverts is worse than no button.

Leaving the token off the list would have been easier and would have looked like Hearth
had simply not got to it. A saver who goes looking for tGBP finds two entries: the mock
pool that works, and the official token that does not, with the reason.

## Where the app gets the addresses

The app never carries an address typed by hand. Every open pool in
`packages/web/src/lib/chain/pools.json` is generated from a file the deploy script wrote,
by:

```
node scripts/sync-pools.mjs        # from packages/web
```

That script reads `packages/contracts/deployments/sepolia/hearth.<slug>.json`, refuses any
file missing an address, refuses two pools claiming the same slug, and appends the one
restricted entry that has no deployment. Run it after every deploy. The environment
variables that used to hold a single pool's three addresses are gone.

The pool a saver is looking at is the first segment after `/app`:

| Route | What it shows |
| --- | --- |
| `/app` | Redirects to the pool the saver last used, or `usdc` on a first visit |
| `/app/<slug>` | That pool's dashboard |
| `/app/<slug>/deposit` | Mint, shield and deposit for that token |
| `/app/<slug>/withdraw` | Withdraw and unshield for that token |
| `/app/<slug>/draws` | That pool's draws, and the saver's own result in each |
| `/app/<slug>/run` | The five permissionless draw steps for that pool |
| `/verify?pool=<slug>` | The public seed, bracket and thresholds for that pool |

A language code sits in front of all of them for every language but English, so the
Japanese reader's dashboard is `/ja/app/weth`.

## One keeper per pool

Seven pools means seven keeper processes, each signing from its own account index of the
same seed phrase, because two processes on one account fight over the same nonce. The
table and the pm2 file are in [the keeper](../operations/keeper.md).
