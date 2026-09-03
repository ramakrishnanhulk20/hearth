# FAQ

## 1. Where is the claim button?

In the app, on that draw's card, beside your revealed result. Under the hood it is
deliberately not a separate transaction: prizes are credited to your encrypted winnings
balance during evaluation, and the claim button, which carries the amount, sends an
ordinary withdrawal for it, which on chain looks exactly like any other withdrawal. In
most prize protocols only winners have a reason to send a claim transaction, so the
transaction list quietly names them; here there is no such transaction to watch for.

## 2. Can I lose my principal?

No. Prizes are paid out of yield, never out of anybody's deposit, and `withdraw` is always
open, including while a draw is running. The one thing you can lose is a prize you would
have won: if the evaluation walk does not reach you inside the two-period window, that draw
pays you nothing and the money goes back to the tier. See limitation 2.

## 3. Can you see my balance or my winnings?

No. Your principal, your winnings, your weight for each draw and your credit for each draw
are encrypted values that only your address is granted access to, and Zama's access control
list enforces that on chain, not as a policy we promise. We can see the same things a
stranger can: that you deposited, when, and nothing about the amount.

## 4. How are my odds worked out?

By your average balance across the whole period, not your balance when the draw happens.
Hold 100 USDC for a full one-hour period and your weight is 360,000 USDC-seconds; your
expected prizes in a tier are that weight divided by the published bracket, multiplied by
the tier's odds and prize count. Splitting your money across wallets changes nothing,
because the expectation is exactly proportional to weight.

## 5. I deposited five minutes before the draw and won nothing. Why?

Because five minutes of a one-hour period is one twelfth of the odds you would have had by
holding all period. That is what stops somebody flashing a large balance in just before
each draw, winning, and withdrawing; we executed that attack against our own earlier design
and it took 19 of 20 draws. Deposit and leave it, and you get your full share from the next
full period.

## 6. Do my winnings earn odds too?

Not on their own. Winnings sit in a separate encrypted balance that does not count toward
your weight, so compounding is not automatic: withdraw them and deposit them back to put
them to work. That separation is what lets a withdrawal of a prize look identical to a
withdrawal of savings.

## 7. Who triggers the draws, and what happens if they stop?

We run a keeper script. The pool also implements Chainlink's automation interface, so a
time-based upkeep could cover the close step, though none is registered on the demo pool
yet. Either way, every step of a draw is callable by anyone, including you from the app.
Closing has a deadline of its own, half a period before the window ends, so that a close
can never land too late for the award to follow it. If nothing runs, that draw is skipped: its liquidity stays in the
tiers for the next draw, the yield is booked whenever a late award lands, and deposits and
withdrawals keep working. A stalled keeper costs draws, never money.

## 8. Could you rig the random number, or the size of the prize?

Neither. The seed is generated inside Zama's coprocessor as a ciphertext, so nobody sees it
at the moment it is drawn, and closing a draw succeeds exactly once, so there is no second
roll. Prize sizes are fixed earlier in that same transaction, before the seed exists, so
nobody can read a seed, work out that they won, and then make the win bigger. After the
period ends the seed is published with a signature from Zama's key management service that
the contract verifies on chain, and from it anyone can recompute the exact threshold any
address had to beat.

## 9. Why does the pool publish only a rough size instead of its exact total?

Because the exact total gives away individual deposits. Two consecutive totals, plus the
public timestamp of your own deposit, let anyone solve for your exact amount if you were
the only one who moved money in that period. Not an estimate, the number. So the vault
publishes only the smallest power of two above the total, which the draw runs against
instead. The cost is that a tier pays between half and all of its nominal prize count each
draw, with the rest carried forward and offered again, so prize sizes settle a little
larger. Nobody's odds are distorted relative to anybody else's.

## 10. Where does the prize money come from?

On Sepolia, from a sponsor-funded balance that drips at a fixed rate, because no venue on
Sepolia pays yield on Zama's mock USDC. On mainnet the same interface plugs into Zama's
Confidential Vault, which puts confidential USDC into a real ERC-4626 yield vault through a
batcher. Either way the pool books only the amount a KMS-verified decryption says actually
arrived, never a number the source reports about itself.

## 11. What can somebody watching the chain learn about me?

That you are a saver, which block you deposited or withdrew in, and which evaluation batch
you were in. Not your balance, not your odds, not whether you won. Four seams are worth
knowing. The published bracket is close to personal information when there are fewer than
three savers. If somebody can pin your balance, usually by watching a public wrap that is
followed by a deposit of the same size, then your result in every draw is public arithmetic
from then on, because thresholds are public by design. Wrapping in and unwrapping out in
full publishes a lower bound on everything you have won. And each tier publishes how many
prizes it paid, one draw later, which is a coarse measurement of the encrypted balances and
slowly narrows a balance that never moves. We publish that count every draw because it is
the same step that returns unwon money to the public pot, which is what lets the jackpot
accumulate where you can watch it. All four are covered in
[what stays private](security/what-stays-private.md).
