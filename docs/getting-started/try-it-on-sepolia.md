# Try it on Sepolia

Sepolia is Ethereum's public test network. The money on it is not real, so you can run the
whole cycle for free. The USDC pool draws every hour and the other six draw every six
hours, so pick USDC if you want to watch a draw for a period you deposited in. The
two-minute path at the bottom of this page does not wait for one.

The live app is at https://hearth-ram.vercel.app. Everything below can also be done straight from a block
explorer if you prefer to watch the raw calls.

Two ways in with a wallet. If the browser has an extension, "Connect wallet" uses it. If it
has none, "Scan with a phone" shows a WalletConnect code that a mobile wallet reads, which
is the only path on a machine you cannot install anything on. A browser with no wallet at
all is told which one to install and where, rather than being handed a button that fails
halfway.

## 0. Pick a token

Hearth runs seven pools, one per confidential token Zama publishes on Sepolia. Each is a
separate set of contracts with its own savers, its own prize money and its own clock, so
choosing a token is choosing a pool. The token name at the top of the rail opens the
picker, and the pool you are in is the first part of the URL: `/app/usdc`, `/app/weth` and
so on.

| Token | Slug | Draw every | Public token with the open `mint` |
| --- | --- | --- | --- |
| Confidential USDC (Mock) | `usdc` | 1 hour | `0x9b5Cd13b8eFbB58Dc25A05CF411D8056058aDFfF` |
| Confidential USDT (Mock) | `usdt` | 6 hours | `0xa7dA08FafDC9097Cc0E7D4f113A61e31d7e8e9b0` |
| Confidential WETH (Mock) | `weth` | 6 hours | `0xff54739b16576FA5402F211D0b938469Ab9A5f3F` |
| Confidential BRON (Mock) | `bron` | 6 hours | `0xFf021fB13cA64e5354c62c954b949a88cfDEb25E` |
| Confidential ZAMA (Mock) | `zama` | 6 hours | `0x75355a85c6FB9df5f0C80FF54e8747EEe9a0BF57` |
| Confidential tGBP (Mock) | `tgbp` | 6 hours | `0x93c931278A2aad1916783F952f94276eA5111442` |
| Confidential XAUt (Mock) | `xaut` | 6 hours | `0x24377AE4AA0C45ecEe71225007f17c5D423dd940` |

The picker also lists Zama's official **Confidential tGBP**, greyed out, because its
underlying mint belongs to the issuer and nobody else can obtain the token. The reason sits
under its name, in the language you are reading, and choosing it shows a page that names the
token, links both contracts and offers no wallet action, rather than a deposit button that
would revert. A pool that has not closed its first draw yet uses that same line under its
name to say when that draw is, because there is a time to give rather than a prize.

The app reads in sixteen languages, chosen from the button in the top bar or the one in the
console rail. English keeps the plain URLs and every other language puts its code in front,
so the same screen in Japanese is `/ja/app/usdc`. Arabic mirrors the layout. Every language
keeps Western digits and a twenty-four hour UTC clock, Arabic included, so a figure on the
screen matches the figure on a block explorer, and every amount field accepts a comma or a
point as the decimal mark, refusing only an amount that carries both. These documentation
pages are translated the same way, page for page, and a page nobody has translated yet shows
the English one with a line at the top saying so. Every translation was written by a model
rather than a native speaker: English is the source of truth for every number and contract
name, as [limitations](../limitations.md) says.

## Contracts you will touch

The walkthrough below uses the USDC pool. Every other pool is the same set of contracts at
different addresses, listed in [pools and tokens](../concepts/pools-and-tokens.md).

| What | Address | Who deployed it |
| --- | --- | --- |
| Mock USDC (public ERC-20, open `mint`) | `0x9b5Cd13b8eFbB58Dc25A05CF411D8056058aDFfF` | Zama |
| Confidential USDC (`cUSDCMock`, ERC-7984 wrapper) | `0x7c5BF43B851c1dff1a4feE8dB225b87f2C223639` | Zama |
| HearthVault | `0x0F93e5db6027b4FB1C76566d24aA2D2E417fAF52` | Hearth |
| HearthPrizePool | `0xA0785AacF30B6FE46EDc53CD8A9db1d94FeF5Df2` | Hearth |
| SponsoredYieldSource | `0xCC49DF69eAB6884fD8DD9260902B8A0Abc9D6b91` | Hearth |

The two Zama addresses are the ones published in Zama's own Confidential Vault address
reference for Sepolia, so the test token is Zama's, not ours. Every confidential wrapper on
that list uses 6 decimals, which means every on-chain amount in the wrapper is in
millionths: 1,000 USDC is written `1000000000`. The public token underneath can use a
different scale, and the wrapper's `rate()` is the conversion. Mock USDC also uses 6, so
the two agree; mock WETH uses 18, so its rate is a million million.

## 1. Get Sepolia ETH

You need a small amount of Sepolia ETH to pay gas. Any Sepolia faucet works. The ones in
common use are the Google Cloud Web3 faucet, Alchemy's Sepolia faucet and the Chainlink
faucet, and each pays out enough for this walkthrough in one request. A tenth of an ETH
is far more than enough.

## 2. Mint the test token

Every one of the seven public mocks has a public `mint(address, uint256)` with no owner
check, capped at one million tokens per call, and the addresses are in the table above. The
app exposes it as one button on the Deposit screen of whichever pool you are in, on the
first of its three steps, labelled "Get test USDC" while your wallet holds none and "Get a
million more" once it does, with that pool's own token in the label. By hand, for USDC, it
is:

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

In the app those two calls are step 2 of Deposit, "Shield your USDC". The button reads
"Shield", and "Approve the wrapper" while the wrapper's allowance is short of the amount
you typed. The approval is asked for once, for a large allowance, so every shield after
the first is a single transaction instead of two. It reaches exactly one contract, that
token's confidential wrapper, and lets it pull the public mock token out of your wallet
and nothing else. The screen says both of those things beside the button rather than
leaving them to be found.

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

That has one consequence worth knowing before you type a figure. Asking to deposit more
than your confidential balance is not refused anywhere on chain: the token moves what the
wallet has, which can be nothing, and the transaction succeeds having achieved nothing. So
the screen holds that line itself. Once you have opened your confidential balance with the
eye, the deposit field says "That is more than you hold" and the button stays off. The
unshield screen goes further, because there is nothing to open there: it reads your public
token balance before the run and again after it, and if the two are identical it says
"Nothing moved", names the over-large amount as the usual cause, and points at "All of it".

The vault refuses a deposit whose amount, or whose resulting principal, would push you
above the per-saver cap, which on a one-hour period is about 5 billion tokens and on a
six-hour period about 854 million. Both halves
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
the warning on the shield step rather than hiding the trade-off.

It is worth being blunt about what a pinned balance costs you, because it is more than the
deposit amount. Thresholds are public by design, since they are what makes the draw
checkable. So anyone who knows your balance can compute whether you won, in every tier, in
every draw from then on, without decrypting anything. That is why this is two steps and
not one.

## 5. Wait for a draw

A period is one hour in the USDC pool and six hours in the other six, for the gas reason in
[pools and tokens](../concepts/pools-and-tokens.md). The draw for a period can only be
closed after that period has ended, and everything about it has to finish within the
following two periods.
Closing itself has a tighter deadline, the middle of the second of those periods, so that
the decryption round trip and the award always have room. So a deposit you make now earns
odds for the current period, and the result of that period lands within the next couple of
hours.

The dashboard shows the current period and the time left in "The pool right now", and "My
draws" in the sidebar shows the state of the last few. You do not have to do anything. If
you want to push it along yourself, every step of a draw is callable by anyone, and "Run a
draw" in the sidebar has all five; see [the keeper page](../operations/keeper.md).

Your odds for a period are based on your average balance across that whole period, not
your balance at the end of it. Depositing five minutes before a one-hour period closes buys
you one twelfth of the odds of having held the same amount all period. That is deliberate;
see
[time-weighted balance](../concepts/time-weighted-balance.md).

## 6. Reveal what you hold and what you won

Press the eye beside "Principal" in the "What you hold" card on the dashboard, and sign
the message your wallet shows you. Sealed values are shown as asterisks until you do, and
the eye is the only thing that opens them.

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

The first two open together from the one eye in "What you hold", on the dashboard. The
last two open together from the eye beside "Your prize", under "Your result" on that
draw's card on "My draws". Your balance and a draw's result can be open at the same time,
the signature from the first serves the second, and pressing an open eye seals only the
card it sits in.

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
how you learn about it. Once that draw's result is open, its card on "My draws" shows a
claim button carrying the amount, such as "Claim 1.00 USDC"; pressing it sends an ordinary
withdrawal for exactly that amount, and step 8 takes the rest home. On chain a claim and a
withdrawal are the same call with the same shape, and that is what keeps a winner from
standing out.

The one eye on that card opens three figures at once: your weight for the draw, that
draw's credit, and `confidentialWinningsOf`, which is everything the vault still owes this
wallet across every draw. The button is gated on both the credit and that running figure,
and it offers the smaller of the two. A draw's credit never changes once it is written, so
a card gated on the credit alone would offer the same prize again after a reload and the
chain would honour it, out of your own principal. The running figure falls the moment a
claim lands, which is what takes the button away and leaves the card saying the prize has
already been taken out, with the figure kept as the draw's record.

There is nothing to press to be credited, either. Evaluation walks the saver list from a
point that draw's seed decides. The "Advance the draw" button on that draw's card, and
"Advance" on the "Run a draw" screen, both move that shared walk forward rather than
picking you out of it. A saver who presses either is not telling anybody they won.

## 8. Withdraw

```
vault.withdraw(encryptedAmount, inputProof)      // or vault.withdrawAll()
```

In the app those are the "Withdraw" and "Withdraw everything" buttons on the Withdraw
screen, on its "Out of the vault" tab. "All of it" beside the field is not a third call: it
fills the field with everything you hold, once you have opened your balance.

Withdrawals pay from winnings first, then from principal. The amount is clamped to the
smaller of what you hold and what the vault holds, because a confidential transfer moves
the whole amount or nothing at all and never a part of it. Working that out before the
transfer is what keeps the ledger exact without any repair afterwards. One confidential
transfer, one event, an encrypted amount.

Principal is never locked. You can withdraw in the middle of a draw, and the weight the
draw already fixed for you does not change.

## 9. Unshield: unwrap back to public USDC

Two calls, because unwrapping is asynchronous by design. First `unwrap`, then
`finalizeUnwrap`. The app sends both from the "Unshield" button on the Withdraw screen's
"Back to plain USDC" tab. If the second one is ever left undone, a warning card sits above
the two tabs until you press "Finish the unshield" on it. The exact argument lists are in
Zama's wrapper, not ours.

The first call burns the encrypted amount and marks it for public decryption. The second
releases the plaintext tokens once Zama's protocol has produced the cleartext and its
proof. The app reads your public token balance before the first call and again after the
second, and reports the difference, so "unshielded 250.00 USDC" is a measured fact rather
than the number you typed. When that difference is zero it says "Nothing moved" instead of
declaring success: both transactions did land, and the wrapper releases nothing rather
than refusing when the amount was above your confidential balance. The amount you unwrap is public, exactly like the amount you wrapped, and it is the
first call that publishes it, so an unwrap you never finalize has already leaked.

That gives a second thing worth knowing. If you wrap in and unwrap out in full, the
difference between the two public totals is a lower bound on everything you have ever won,
and once you have emptied out it is exact. Unwrapping to a fresh address does not help,
because the confidential transfer to that address is itself the link. If it matters to
you, unwrap in round numbers unrelated to your position, or leave a standing confidential
balance behind.

## Try it in two minutes

The app is a console with a rail down the left, one task per screen, so the path is a walk
down that rail.

1. Open https://hearth-ram.vercel.app, follow "The pool" in the header to `/app`, and connect a wallet on
   Sepolia, with the browser extension or by scanning the code with a phone wallet. You land
   in the USDC pool at `/app/usdc`; the token name at the top of the rail switches pools. The
   dashboard opens with a block marked "Next" naming the one thing to do.
2. "Deposit" in the sidebar, which opens on whichever of its three steps your wallet is up
   to. Click "Get test USDC", then "Shield", then "Deposit". The first shield asks for one
   approval of the wrapper and no shield after it asks again.
3. Back on the dashboard, press the eye beside "Principal" in "What you hold" and sign:
   your principal and your winnings both appear, in the browser only.
4. "Run a draw" in the sidebar, the row marked "Anyone". Press "Close", then "Award", to
   close and award the last finished period yourself, or watch the keeper do it.
5. Press "Advance" on the same screen. Then open "My draws" and press the eye under "Your
   result" on that draw's card: your weight and credit for that draw appear, and the
   balance from step 3 stays open on one signature.
6. Open `/verify?pool=usdc`: the public seed and bracket are there, "Thresholds for an
   address" recomputes your thresholds in front of you, and the comparison matches. Swap
   the `pool` parameter for any other slug to check that pool instead.
7. "Withdraw" in the sidebar, "Out of the vault" tab, "Withdraw everything". Principal and
   any winnings come back in one transfer.

Nothing in that path needs us to be online. Every step of the draw is permissionless.
