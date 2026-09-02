# Time-weighted balance

Your odds in a draw are not based on what you hold when the draw happens. They are based
on your average balance across the whole period. This page explains why, what it costs a
late depositor, and why the vault only needs to remember three moments per saver.

## Why average, not final

Take the simple design first: weight everyone by their balance at the instant the draw is
taken. It is easy to build, and it is broken.

An attacker deposits a large amount, waits for the draw, wins, and withdraws. Their money
was in the pool for one block. They earned no yield for anybody, they carried no risk,
and they took the prize that the patient savers funded. Then they do it again next draw.

We executed this against our own earlier design on 2 September 2026. In a pool where one
honest saver held 100 USDC, an attacker cycling 9,000 USDC in and out around each draw
won 19 of 20 draws and emptied a 5,000 USDC prize reserve. The attacker's capital was
never at risk, because a no-loss pool by definition returns it. The whole cycle even fit
inside a single transaction: deposit, open the draw, scan, withdraw, gas 2,189,992.

The fix is the one PoolTogether uses. Their own documentation puts it this way: the
ability to look back in time matters "so that users can deposit and withdraw freely into
a prize pool while having their liquidity contribution measured perfectly." Measure the
contribution, not the snapshot.

## What a late deposit is worth

A period on Sepolia is 1,800 seconds. Weight is balance multiplied by the seconds it was
held, so weight is measured in USDC-seconds.

| Saver | What they did | Weight for the period |
| --- | --- | --- |
| Ada | Held 100 USDC for the whole 1,800 seconds | 100 x 1800 = 180,000 |
| Ben | Deposited 1,000 USDC with 180 seconds left | 1,000 x 180 = 180,000 |
| Cy | Held 1,000 USDC for the whole period | 1,000 x 1800 = 1,800,000 |

Ben put in ten times Ada's money and bought exactly the same odds, because he was there
for one tenth of the time. Cy, who did what the product is for, has ten times the odds of
either.

The mirror case works too. Withdraw the instant a draw closes and you keep the weight you
already earned for the finished period, and you carry almost nothing into the next one.
You cannot rent odds.

None of this stops someone who genuinely holds a large balance for a full period from
winning often. That is not an attack. That is the product working: their money was in the
pool, earning the yield that pays everyone's prizes, for the whole time.

## How the vault remembers

The vault stores three snapshots per saver, called observations. Each one holds three
things: a running total of balance-seconds, the balance right after that change, and the
timestamp. The three slots are named `current`, `previous` and `older`.

The running total resets at the start of each period. That reset is what keeps the number
small: within one period it can never exceed balance multiplied by the period length.

When your balance changes, one of three things happens:

- **Your first ever change.** The `current` slot is created with a running total of zero
  and your new balance.
- **A change in the same period as `current`.** The vault adds the balance-seconds you
  earned since the last change, then overwrites `current` in place. No new slot is used.
- **A change in a later period than `current`.** The three slots shift down: `older` takes
  the old `previous`, `previous` takes the old `current`, and a fresh `current` is
  written, carrying the balance-seconds you earned from the start of this period up to
  now.

Reading your weight for period `p` uses the newest observation at or before that period:

- If it sits inside period `p`, your weight is the running total it carries plus your
  balance multiplied by the seconds from that moment to the end of the period.
- If it sits before period `p`, you did not touch your balance during the period at all,
  so your weight is simply that balance multiplied by the full period length.
- If you have no observation at or before period `p`, you were not a saver yet, and your
  weight is zero. That case is decided from public timestamps with no encrypted
  arithmetic at all.

Every encrypted step here is one multiply by a public number and one add. That is what
keeps evaluation cheap enough to batch.

## Why three observations are enough

This is the question a reviewer should ask, and the answer is a counting argument.

A new slot is pushed only when a balance change lands in a period later than the one
`current` sits in. At most one push happens per period, no matter how many times you
deposit or withdraw inside it.

Draw `p` can only be closed, awarded and evaluated during periods `p+1` and `p+2`. So by
the time anybody reads your weight for period `p`, at most two periods later than `p`
have started, and therefore at most two new observations have been pushed on top of
whatever was newest at or before period `p`. Three slots hold it: the one we need, plus
the at most two that landed after it.

That is why the window is two periods and not longer. Widen the window and you need a
fourth slot; keep it at one period and a single delayed relayer response can lose a draw,
which is what a 30-minute period made painfully likely.

The vault keeps the same three observations for the pool's total balance, so the
aggregate weight of a period is computed by the identical rule and is valid over the same
window.

## The two size limits

Encrypted values here are 64-bit unsigned integers, so the arithmetic has to stay inside
that range. Overflowing an encrypted number is worse than overflowing a plain one,
because nothing reverts and nobody sees it happen.

**Per saver.** The vault refuses any deposit that would take you above
`maxPrincipal = (2^64 - 1) / L`. At a 30-minute period that is about 10 billion USDC. At
a daily period it is about 213 million USDC. Since your running total cannot exceed your
balance multiplied by the period length, and your balance cannot exceed that cap, your
running total cannot exceed 64 bits. The refusal is returned as an encrypted false and
the token refunds you in the same transaction, so hitting the cap does not disclose your
balance.

**For the pool total.** The total's running accumulator is 128 bits rather than 64, so
the aggregate cannot overflow for any supply the wrapper is able to mint.

An earlier version of this design claimed a 64-bit accumulator could not overflow. That
was wrong, a design review caught it, and the cap plus the 128-bit total is the fix.

## What this page does not cover

It does not cover what happens once your weight is known. That is the
[winner test](winner-selection.md). It also does not claim time weighting is a privacy
feature: your weight is encrypted, but the pool's total weight for each period is
published, and with very few savers that total is informative. See
[what stays private](../security/what-stays-private.md).
