# Try it on Sepolia

Sepolia is Ethereum's public test network. The money on it is not real, so you can run the
whole cycle for free. A period on Sepolia is one hour, so budget up to about an hour and a
half if you want to watch the draw for a period you deposited in. The two-minute path at
the bottom of this page does not wait for one.

The live app is at {{APP_URL}}. Everything below can also be done straight from a block
explorer if you prefer to watch the raw calls.

## Contracts you will touch

| What | Address | Who deployed it |
| --- | --- | --- |
| Mock USDC (public ERC-20, open `mint`) | `0x9b5Cd13b8eFbB58Dc25A05CF411D8056058aDFfF` | Zama |
| Confidential USDC (`cUSDCMock`, ERC-7984 wrapper) | `0x7c5BF43B851c1dff1a4feE8dB225b87f2C223639` | Zama |
| HearthVault | `0x0F93e5db6027b4FB1C76566d24aA2D2E417fAF52` | Hearth |
| HearthPrizePool | `0xA0785AacF30B6FE46EDc53CD8A9db1d94FeF5Df2` | Hearth |
| SponsoredYieldSource | `0xCC49DF69eAB6884fD8DD9260902B8A0Abc9D6b91` | Hearth |

The two Zama addresses are the ones published in Zama's own Confidential Vault address
reference for Sepolia, so the test token is Zama's, not ours. Both tokens use 6 decimals,
which means every on-chain amount is in millionths: 1,000 USDC is written `1000000000`.

## 1. Get Sepolia ETH

You need a small amount of Sepolia ETH to pay gas. Any Sepolia faucet works. The ones in
common use are the Google Cloud Web3 faucet, Alchemy's Sepolia faucet and the Chainlink
faucet, and each pays out enough for this walkthrough in one request. A tenth of an ETH
is far more than enough.

## 2. Mint the test USDC

Zama's mock USDC has a public `mint(address, uint256)` with no owner check, capped at one
million tokens per call. The app exposes it as one button in the "Deposit" panel, labelled
"Get test USDC" while your wallet holds none and "Get a million more" once it does. By
hand it is:

```
USDCMock.mint(yourAddress, 1000000000)     // 1,000 USDC
```

Ask for more than you need. Nothing here is worth anything.

## 3. Shield: wrap USDC into confidential USDC

Confidential USDC is Zama's ERC-7984 wrapper around that mock USDC. ERC-7984 is the
confidential token standard: balances live on chain as encrypted values instead of
numbers anybody can read. Wrapping is two calls:

```
USDCMock.approve(cUSDC, 1000000000)
cUSDC.wrap(yourAddress, 1000000000)
```

In the app those two calls are the "Approve" and "Wrap" buttons under that same heading.
Approve only appears while the wrapper's allowance is short of the amount you typed.

You now hold 1,000 confidential USDC. From here on, your balance is a ciphertext handle
and only you can read it.

Wrapping is public. The wrapper emits a `Wrap` event carrying the plaintext amount, the
underlying ERC-20 transfer carries it again, and the amount appears a third time in the
coprocessor's trivial-encryption record. There is no way around that: converting a public
token into a confidential one is by definition a public act.

## 4. Deposit into the pool

One call, and the amount is encrypted from the start:

```
cUSDC.confidentialTransferAndCall(vault, encryptedAmount, inputProof, "")
```

The app builds the encrypted input and its proof for you with Zama's SDK. The vault's
receive hook credits exactly the amount the token says actually moved, not the amount you
asked for, so a transfer that is short for any reason cannot create phantom principal.

The vault refuses a deposit whose amount, or whose resulting principal, would push you
above the per-saver cap, which on a one-hour period is about 5 billion USDC. Both halves
of that check matter: encrypted addition wraps silently at 64 bits, so bounding the
incoming amount as well as the total is what stops a huge deposit from wrapping the sum
round to a small number and slipping through. The refusal is itself encrypted: the hook
returns an encrypted false and the token refunds you inside the same transaction, so a
rejection does not tell anyone what your balance was.

### Why wrap and deposit are two steps, not one

Most apps in this field bundle "approve, wrap, deposit" behind a single button. It is
friendlier and it leaks your deposit.

We measured this on our own previous deployment. Reading the public logs of Sepolia
blocks 11528000 to 11618500, three of the five deposits sat two to four blocks after a
public `Wrap` of exactly 100 USDC by the same address. Anyone reading the chain could
price those three deposits at 100 USDC each without breaking anything. Zama's own
documentation names the same problem and calls it shield-join correlation: "A user who
wraps 50,000 USDC and joins a batch minutes later has effectively published only the
upper bound on their join amount."

So Hearth keeps them apart on purpose:

- Wrap once, in a round number, at a time of your choosing.
- Hold a standing confidential balance and deposit part of it later.
- Deposit again from the same balance without wrapping again.

The correlation weakens with time, with reuse of a standing balance, and with other
people's wrapper traffic. Doing it in one click removes all three defences. The app shows
the warning at the wrap step rather than hiding the trade-off.

It is worth being blunt about what a pinned balance costs you, because it is more than the
deposit amount. Thresholds are public by design, since they are what makes the draw
checkable. So anyone who knows your balance can compute whether you won, in every tier, in
every draw from then on, without decrypting anything. That is why this is two steps and
not one.

## 5. Wait for a draw

Periods on Sepolia are one hour long. The draw for a period can only be closed after that
period has ended, and everything about it has to finish within the following two periods.
Closing itself has a tighter deadline, the middle of the second of those periods, so that
the decryption round trip and the award always have room. So a deposit you make now earns
odds for the current period, and the result of that period lands within the next couple of
hours.

The app shows the current period, the time left, and the state of the last few draws. You
do not have to do anything. If you want to push it along yourself, every step of a draw is
callable by anyone; see [the keeper page](../operations/keeper.md).

Your odds for a period are based on your average balance across that whole period, not
your balance at the end of it. Depositing five minutes before the period closes buys you
one twelfth of the odds of having held the same amount all period. That is deliberate; see
[time-weighted balance](../concepts/time-weighted-balance.md).

## 6. Reveal what you hold and what you won

Click "Reveal" in the "What you hold" panel and sign the message your wallet shows you.
That signature is EIP-712 user decryption: a typed off-chain signature that proves to
Zama's relayer that you control the address, in exchange for the plaintext of values the
contract has granted you access to. It is not a transaction. It costs no gas and writes
nothing to the chain.

You can reveal four things about yourself:

| Value | Meaning |
| --- | --- |
| Principal | What you have saved. |
| Winnings | Prize money credited to you and not yet withdrawn. |
| Weight, per draw | Your time-weighted balance for that period, the number the winner test compared. |
| Credit, per draw | What that draw paid you. Zero if you did not win. |

The first two open from "Reveal" in "What you hold". The last two open from "Reveal my
result" on that draw's card in "Your draws", and only one of the two is open at a time, so
"Seal it again" closes the first before the second will offer itself.

The last two are what let you check the draw yourself: take your weight, take the public
seed and the public bracket, recompute your thresholds, and confirm the credit matches.
The vault exposes the threshold arithmetic as a view, `thresholdOf`, so you can compare
your own working against the contract's. See
[randomness and verification](../security/randomness-and-verification.md).

Nobody else can read any of these four. The relayer refuses a decryption request from an
address the contract has not granted, and that refusal is the enforcement, not a policy.

## 7. Claim

There is no claim transaction, only a claim button.

Your prize is already in your winnings balance the moment the walk reaches you. Step 6 is
how you learn about it. Once that draw's result is revealed, its card shows a claim button
carrying the amount, such as "Claim 1.00 USDC"; pressing it sends an ordinary withdrawal
for exactly that amount, and step 8 takes the rest home. On chain a claim and a withdrawal
are the same call with the same shape, and that is what keeps a winner from standing out.

There is nothing to press to be credited, either. Evaluation walks the saver list from a
point that draw's seed decides, and the app's "Advance the draw" button moves that shared
walk forward rather than picking you out of it. A saver who presses it is not telling
anybody they won.

## 8. Withdraw

```
vault.withdraw(encryptedAmount, inputProof)      // or vault.withdrawAll()
```

In the app those are the "Withdraw" and "All of it" buttons in the "Withdraw" panel.

Withdrawals pay from winnings first, then from principal. The amount is clamped to the
smaller of what you hold and what the vault holds, because a confidential transfer moves
the whole amount or nothing at all and never a part of it. Working that out before the
transfer is what keeps the ledger exact without any repair afterwards. One confidential
transfer, one event, an encrypted amount.

Principal is never locked. You can withdraw in the middle of a draw, and the weight the
draw already fixed for you does not change.

## 9. Unshield: unwrap back to public USDC

Two calls, because unwrapping is asynchronous by design. First `unwrap`, then
`finalizeUnwrap`. The app sends both from its "Unwrap" button, and offers "Finish it" if
the second one was ever left undone. The exact argument lists are in Zama's wrapper, not
ours.

The first call burns the encrypted amount and marks it for public decryption. The second
releases the plaintext tokens once Zama's protocol has produced the cleartext and its
proof. The amount you unwrap is public, exactly like the amount you wrapped, and it is the
first call that publishes it, so an unwrap you never finalize has already leaked.

That gives a second thing worth knowing. If you wrap in and unwrap out in full, the
difference between the two public totals is a lower bound on everything you have ever won,
and once you have emptied out it is exact. Unwrapping to a fresh address does not help,
because the confidential transfer to that address is itself the link. If it matters to
you, unwrap in round numbers unrelated to your position, or leave a standing confidential
balance behind.

## The two-minute judge path

1. Open {{APP_URL}}, follow "The pool" in the header to `/app`, and connect a wallet on
   Sepolia.
2. In "Deposit", click "Get test USDC", then "Wrap", then "Deposit".
3. Click "Reveal" in "What you hold" and sign: your principal appears, in the browser only.
4. In "Run the draw", press "Close", then "Award", to close and award the last finished
   period yourself, or watch the keeper do it.
5. Press "Advance", then "Seal it again" and "Reveal my result" on that draw's card: your
   weight and credit for that draw appear.
6. Open `/verify`: the public seed and bracket are there, "Thresholds for an address"
   recomputes your thresholds in front of you, and the comparison matches.
7. Click "All of it" in "Withdraw". Principal and any winnings come back in one transfer.

Nothing in that path needs us to be online. Every step of the draw is permissionless.
