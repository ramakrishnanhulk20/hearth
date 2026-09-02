# FAQ

## 1. Where is the claim button?

In the app, right under your revealed winnings. Under the hood it is deliberately not a
separate transaction: prizes are credited to your encrypted winnings balance during
evaluation, and "Claim prize" sends an ordinary withdrawal for that amount, which on chain
looks exactly like any other withdrawal. In most prize protocols only winners have a reason
to send a claim transaction, so the transaction list quietly names them; here there is no
such transaction to watch for.

## 2. Can I lose my principal?

No. Prizes are paid out of yield, never out of anybody's deposit, and `withdraw` is
always open, including while a draw is running. The one thing you can lose is a prize you
would have won: if nobody evaluates you inside the two-period window, that draw pays you
nothing and the money returns to the tier. See limitation 2.

## 3. Can you see my balance or my winnings?

No. Your principal, your winnings, your weight for each draw and your credit for each
draw are encrypted values that only your address is granted access to, and Zama's access
control list enforces that on chain, not as a policy we promise. We can see the same
things a stranger can: that you deposited, when, and nothing about the amount.

## 4. How are my odds worked out?

By your average balance across the whole period, not your balance when the draw happens.
Hold 100 USDC for a full 30-minute period and your weight is 180,000 USDC-seconds; your
expected prizes in a tier are that weight divided by the pool's total, multiplied by the
tier's odds and prize count. Splitting your money across wallets changes nothing, because
the expectation is exactly proportional to weight.

## 5. I deposited five minutes before the draw and won nothing. Why?

Because five minutes of a 30-minute period is one sixth of the odds you would have had by
holding all period. That is what stops somebody flashing a large balance in just before
each draw, winning, and withdrawing; we executed that attack against our own earlier
design and it took 19 of 20 draws. Deposit and leave it, and you get your full share from
the next full period.

## 6. Do my winnings earn odds too?

Not on their own. Winnings sit in a separate encrypted balance that does not count toward
your weight, so compounding is not automatic: withdraw them and deposit them back to put
them to work. That separation is what lets a withdrawal of a prize look identical to a
withdrawal of savings.

## 7. Who triggers the draws, and what happens if they stop?

We run a keeper script, and Chainlink Automation covers the close step as backup, but
every step of a draw is callable by anyone, including you from the app. If nothing runs,
that draw is skipped: its liquidity stays in the tiers for the next draw, the yield is
booked whenever a late award lands, and deposits and withdrawals keep working. A stalled
keeper costs draws, never money.

## 8. Could you rig the random number?

No. The seed is generated inside Zama's coprocessor as a ciphertext, so nobody sees it at
the moment it is drawn, and closing a draw succeeds exactly once, so there is no second
roll. After the period ends the seed is published with a signature from Zama's key
management service that the contract verifies on chain, and from it anyone can recompute
the exact threshold any address had to beat.

## 9. Where does the prize money come from?

On Sepolia, from a sponsor-funded balance that drips at a fixed rate, because no venue on
Sepolia pays yield on Zama's mock USDC. On mainnet the same interface plugs into Zama's
Confidential Vault, which puts confidential USDC into a real ERC-4626 yield vault through
a batcher. Either way the pool books only the amount a KMS-verified decryption says
actually arrived, never a number the source reports about itself.

## 10. What can somebody watching the chain learn about me?

That you are a saver, which block you deposited or withdrew in, and which evaluation
batch you were in. Not your balance, not your odds, not whether you won. The seams worth
knowing are the pool's published total weight, which is close to personal information when
there are fewer than three savers, and the public wrap amount if you wrap and deposit in
quick succession; both are covered in
[what stays private](security/what-stays-private.md).
