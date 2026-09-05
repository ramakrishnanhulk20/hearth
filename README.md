<!-- logo -->

# Hearth

**Confidential no-loss prize savings on the Zama Protocol, live on seven confidential
tokens.** You deposit a confidential token, your balance stays encrypted on chain, the
yield the pool earns is handed out as prizes every period, and your principal is
withdrawable at any time. Nobody, including us, can read what you saved or what you won.
Anybody can check that the draw was honest.

[Live app](https://hearth-ram.vercel.app) · [Documentation](https://hearth-ram.vercel.app/docs) · [Contracts on Etherscan](https://sepolia.etherscan.io/address/0x0F93e5db6027b4FB1C76566d24aA2D2E417fAF52#code) · [Demo video](https://youtu.be/HEZczDU8iB4) · [X thread](https://x.com/ram_krish2000/status/2095949745135268159)

---

## Live deployments

Ethereum Sepolia, chain id 11155111. Seven pools, one per confidential token Zama
publishes on Sepolia. Each pool is its own vault, its own prize pool, its own yield source
and its own keeper process, and they share nothing on chain. Every contract below is
verified on Etherscan.

| Pool | Draw every | HearthVault | HearthPrizePool | SponsoredYieldSource |
| --- | --- | --- | --- | --- |
| `usdc` | 1 hour | [`0x0F93e5db6027b4FB1C76566d24aA2D2E417fAF52`](https://sepolia.etherscan.io/address/0x0F93e5db6027b4FB1C76566d24aA2D2E417fAF52#code) | [`0xA0785AacF30B6FE46EDc53CD8A9db1d94FeF5Df2`](https://sepolia.etherscan.io/address/0xA0785AacF30B6FE46EDc53CD8A9db1d94FeF5Df2#code) | [`0xCC49DF69eAB6884fD8DD9260902B8A0Abc9D6b91`](https://sepolia.etherscan.io/address/0xCC49DF69eAB6884fD8DD9260902B8A0Abc9D6b91#code) |
| `usdt` | 6 hours | [`0xe54F44dE64F8A7abc0647eaae547dD59ce0EFfac`](https://sepolia.etherscan.io/address/0xe54F44dE64F8A7abc0647eaae547dD59ce0EFfac#code) | [`0x6a83Beb2Dc3f258107Cad5e17BC57657fAd4fbd1`](https://sepolia.etherscan.io/address/0x6a83Beb2Dc3f258107Cad5e17BC57657fAd4fbd1#code) | [`0x5bb1Cd5380Cb9f2B15569030fF0dB7a445cF54cA`](https://sepolia.etherscan.io/address/0x5bb1Cd5380Cb9f2B15569030fF0dB7a445cF54cA#code) |
| `weth` | 6 hours | [`0x3D1A182782B68fE270A66294C9adaC7F005c4f14`](https://sepolia.etherscan.io/address/0x3D1A182782B68fE270A66294C9adaC7F005c4f14#code) | [`0x1a11e7C689F244fA8Dd5f4abA8F2F3131090cc1C`](https://sepolia.etherscan.io/address/0x1a11e7C689F244fA8Dd5f4abA8F2F3131090cc1C#code) | [`0x40DF298f15c6136294eC651aD7b0c1C6F221DE8F`](https://sepolia.etherscan.io/address/0x40DF298f15c6136294eC651aD7b0c1C6F221DE8F#code) |
| `bron` | 6 hours | [`0x18086DC8271f8A73c5Ea985fd519527Dbb991279`](https://sepolia.etherscan.io/address/0x18086DC8271f8A73c5Ea985fd519527Dbb991279#code) | [`0x2Ed982979CD184494B947a1E38E597494a38ACe4`](https://sepolia.etherscan.io/address/0x2Ed982979CD184494B947a1E38E597494a38ACe4#code) | [`0x0cD1155D752bD81b3a437a6f0B3965CAA2A1C8e9`](https://sepolia.etherscan.io/address/0x0cD1155D752bD81b3a437a6f0B3965CAA2A1C8e9#code) |
| `zama` | 6 hours | [`0xEEC26386F273c6678cA538AcA18e1d9384eA9F09`](https://sepolia.etherscan.io/address/0xEEC26386F273c6678cA538AcA18e1d9384eA9F09#code) | [`0x873B285404199D46325a294Aa0EC7a79C30A7fF7`](https://sepolia.etherscan.io/address/0x873B285404199D46325a294Aa0EC7a79C30A7fF7#code) | [`0xdD352D70311E834ab75307f53d5C276060081d23`](https://sepolia.etherscan.io/address/0xdD352D70311E834ab75307f53d5C276060081d23#code) |
| `tgbp` | 6 hours | [`0xCe95dAa01f5354aA8887A5952E403D26d452c323`](https://sepolia.etherscan.io/address/0xCe95dAa01f5354aA8887A5952E403D26d452c323#code) | [`0xC531D54ee2c695e0eBfe8b8258e9Fd80fd507095`](https://sepolia.etherscan.io/address/0xC531D54ee2c695e0eBfe8b8258e9Fd80fd507095#code) | [`0xDEa2BD6351072F735B6ea83c357bF157d83c01af`](https://sepolia.etherscan.io/address/0xDEa2BD6351072F735B6ea83c357bF157d83c01af#code) |
| `xaut` | 6 hours | [`0x77f701101d66FbD522A3bFdC2c00DB09a4F57daE`](https://sepolia.etherscan.io/address/0x77f701101d66FbD522A3bFdC2c00DB09a4F57daE#code) | [`0x9a2888aca42c707A3BC0D561FdF6ff8Abfda5201`](https://sepolia.etherscan.io/address/0x9a2888aca42c707A3BC0D561FdF6ff8Abfda5201#code) | [`0x03fDdAA7C4323C53CE511CC49D4c33B26B492af7`](https://sepolia.etherscan.io/address/0x03fDdAA7C4323C53CE511CC49D4c33B26B492af7#code) |

The token each pool holds is Zama's, not ours: a confidential ERC-7984 wrapper over a
public mock ERC-20 whose `mint` anyone may call, capped at a million tokens a call. Every
wrapper reads six decimals whatever the token underneath reads, and the wrapper's `rate()`
is the conversion (confidential WETH sits over an 18-decimal token, so its rate is a
million million).

| Pool | Confidential asset (ERC-7984) | Public token with the open `mint` |
| --- | --- | --- |
| `usdc` | [`0x7c5BF43B851c1dff1a4feE8dB225b87f2C223639`](https://sepolia.etherscan.io/address/0x7c5BF43B851c1dff1a4feE8dB225b87f2C223639#code) | [`0x9b5Cd13b8eFbB58Dc25A05CF411D8056058aDFfF`](https://sepolia.etherscan.io/address/0x9b5Cd13b8eFbB58Dc25A05CF411D8056058aDFfF#code) |
| `usdt` | [`0x4E7B06D78965594eB5EF5414c357ca21E1554491`](https://sepolia.etherscan.io/address/0x4E7B06D78965594eB5EF5414c357ca21E1554491#code) | [`0xa7dA08FafDC9097Cc0E7D4f113A61e31d7e8e9b0`](https://sepolia.etherscan.io/address/0xa7dA08FafDC9097Cc0E7D4f113A61e31d7e8e9b0#code) |
| `weth` | [`0x46208622DA27d91db4f0393733C8BA082ed83158`](https://sepolia.etherscan.io/address/0x46208622DA27d91db4f0393733C8BA082ed83158#code) | [`0xff54739b16576FA5402F211D0b938469Ab9A5f3F`](https://sepolia.etherscan.io/address/0xff54739b16576FA5402F211D0b938469Ab9A5f3F#code) |
| `bron` | [`0xaa5612FA27c927a0c7961f5AEFEE5ba3A0F9C891`](https://sepolia.etherscan.io/address/0xaa5612FA27c927a0c7961f5AEFEE5ba3A0F9C891#code) | [`0xFf021fB13cA64e5354c62c954b949a88cfDEb25E`](https://sepolia.etherscan.io/address/0xFf021fB13cA64e5354c62c954b949a88cfDEb25E#code) |
| `zama` | [`0xf2D628d2598aF4eAF94CB76a437Ff86CA78FfbFB`](https://sepolia.etherscan.io/address/0xf2D628d2598aF4eAF94CB76a437Ff86CA78FfbFB#code) | [`0x75355a85c6FB9df5f0C80FF54e8747EEe9a0BF57`](https://sepolia.etherscan.io/address/0x75355a85c6FB9df5f0C80FF54e8747EEe9a0BF57#code) |
| `tgbp` | [`0xfCE5c7069c5525eF6c8C2b2E35A745bA20a2F7CC`](https://sepolia.etherscan.io/address/0xfCE5c7069c5525eF6c8C2b2E35A745bA20a2F7CC#code) | [`0x93c931278A2aad1916783F952f94276eA5111442`](https://sepolia.etherscan.io/address/0x93c931278A2aad1916783F952f94276eA5111442#code) |
| `xaut` | [`0xe4FcF848739845BC81Dee1d5352cf3844F0a60C7`](https://sepolia.etherscan.io/address/0xe4FcF848739845BC81Dee1d5352cf3844F0a60C7#code) | [`0x24377AE4AA0C45ecEe71225007f17c5D423dd940`](https://sepolia.etherscan.io/address/0x24377AE4AA0C45ecEe71225007f17c5D423dd940#code) |

The USDC pool came first: block `11622398`, first period `1788386400 (2 September 2026,
22:00:00 UTC)`, hourly draws ever since and now past draw 66. The other six were deployed
on 5 September 2026, in blocks `11641314` through `11641523`, with period 1 starting at
`1788620400` for `usdt` and `1788624000` for the rest.

Six hours rather than an hour, for the six later pools, is a gas decision and nothing else:
a draw at five savers is `8,456,388` gas, so seven hourly pools would spend about
`1.43 ETH` a day on Sepolia and could not be kept funded from public faucets. With six of
them drawing four times a day instead, all seven together cost about `0.41 ETH` a day. The
six-hour odds are set against the longer period rather than carried over, so the grand
prize still pays about once a day in every pool.

**The eighth token, refused on purpose.** Zama also publishes a non-mock Confidential tGBP
at `0x167DC962808B32CFFFc7e14B5018c0bE06A3A208` over
`0xf6Ef9ADB61A48E29E36bc873070A46A3D2667ff3`, whose underlying mint is restricted to the
issuer. Nobody can obtain the public token, so nobody can wrap it and no pool can exist on
it. Hearth lists it in the pool picker anyway, greyed out, with the reason written next to
it, and choosing it opens a page that names the token, links both contracts, says whose
restriction it is and offers no wallet action. Leaving it off the list would have looked
like an oversight instead of a decision.

Chainlink Automation upkeep: not registered yet, the keepers alone run the demo pools.

---

## Overview

PoolTogether invented a good product: a savings pool where you cannot lose your money and
you might win a prize. Everybody's deposits earn yield together, and every period that
yield is handed to a few savers instead of being split into dust. Your chance of winning
is proportional to how much you saved and how long you saved it.

On an ordinary blockchain the whole thing is public. Anyone can read how much every saver
holds, work out each wallet's odds, and see who won every draw. That publishes people's
wealth and paints a target on anyone large. It is the reason a serious saver does not use
a public prize pool for a meaningful amount of money.

Hearth runs the same product over encrypted numbers. Fully homomorphic encryption, usually
shortened to FHE, means arithmetic performed directly on encrypted values without ever
decrypting them. Zama's Protocol brings that to Ethereum, so a Solidity contract can add,
compare and choose between numbers it cannot read. Your balance lives on chain as
ciphertext, which is data that is unreadable without a key, and the contract still runs
the winner test on it.

The part that is easy to get wrong is keeping the draw checkable while the balances stay
secret. Hearth publishes the random seed and a rough scale of the pool, both carrying a
proof the contract verifies on chain, and every threshold any address had to beat follows
from those two numbers by public arithmetic. The rule is public. Only the input is
private.

### Against the status quo

The middle column is the shape most confidential lottery attempts take, and it is the
shape our own first version took. We audited that version and executed the attacks against
it on 2 September 2026, which is where those numbers come from.

| | PoolTogether on a public chain | A scan-based confidential lottery | Hearth |
| --- | --- | --- | --- |
| Your balance | Public | Encrypted | Encrypted |
| Your odds | Public | Encrypted, but taken from your balance at the instant of the draw | Encrypted, taken from your average balance across the whole period |
| Who won a draw | Public | Named by the claim transaction, which only a winner sends | No claim transaction exists to send |
| Flash a large balance in, win, withdraw | Blocked by time-weighted odds | Works. Executed: 19 wins in 20 draws, whole cycle in one transaction | Blocked by time-weighted odds |
| Can a stranger check the draw | Yes, everything is public | No, nothing is published | Yes, the seed and the pool's scale are published with a proof |
| Cost of one draw | One transaction | One chained transaction per group of savers, so one saver can stall everybody | Close in one transaction, then independent batches of `4` savers, in any order |
| How many savers the pool supports | Unlimited | Often capped at 32 addresses | Unlimited. Only the batch size is capped |
| Principal | Withdrawable any time | Withdrawable | Withdrawable any time, including in the middle of a draw |
| Prize money | Real yield | Usually an admin-funded reserve | Sponsored on Sepolia, real yield through Zama's Confidential Vault on mainnet |

### Delete the encryption and there is no product

| Piece of Hearth | Without FHE |
| --- | --- |
| Your balance | A public number. Anyone can price your savings and your odds. |
| The winner test | A public comparison, visible the instant it runs. |
| Who won a draw | Public, because a credit landing in a balance is a visible number. |
| The random seed | Either a public number somebody sees coming, or an off-chain number somebody picks. |
| Prize credits | Public transfers to identified winners. |

What is left is PoolTogether, which already exists and works. The product Hearth sells is
the one a transparent chain cannot offer. Full argument in
[docs/concepts/why-zama.md](docs/concepts/why-zama.md).

---

## Features

### Save privately

- Pick one of seven tokens and deposit it in one transaction. The amount travels as a
  ciphertext handle, which is a pointer to an encrypted value rather than the value itself.
- Principal, unclaimed winnings, your time-weighted weight for each draw and your credit
  for each draw are all encrypted, and only your address is granted access to them.
- Reading your own numbers is an EIP-712 signature, a typed off-chain signature that
  proves you control the address. It is not a transaction. No gas, no trace.
- Wrapping the public token into the confidential one and depositing are deliberately two
  separate steps, because doing both in one click publishes your deposit amount. The app
  explains why at the point where it costs you something.

### Win fairly

- Odds come from your average balance across the whole period, measured in
  balance-seconds, not from your balance when the draw happens. Depositing five minutes
  before a one-hour period closes buys one twelfth of the odds of having held the same
  amount all period.
- The random seed comes from `FHE.randEuint64`, generated inside Zama's coprocessor under
  the network key. Nobody sees it when it is drawn and closing a draw succeeds exactly
  once, so nobody can re-roll it.
- Prize sizes are fixed earlier in the same transaction, before the seed exists. Nobody
  can read a seed, work out that they won, and then make the win bigger.
- Three prize tiers: a rare large one, a middle one, and four small prizes every draw.
- Expected prizes are exactly proportional to your weight, so splitting your money across
  six wallets gains nothing but gas.

### Verify anything

- The seed and the pool's power-of-two scale are published after the period ends, each
  with a signature from Zama's key management service that the contract checks on chain
  with `FHE.checkSignatures`.
- From those two numbers anyone recomputes the exact threshold any address had to beat, in
  any tier. The vault exposes the same arithmetic as a view, `thresholdOf`, so the app,
  the test suite and anyone with a block explorer read one implementation.
- A saver can go further: decrypt your own weight and your own credit for a draw and check
  the two against each other.
- Every unpaid unit of prize money is accounted for. The unfunded counter is published at
  every finalization and is zero whenever the pool is solvent.

### Leave any time

- `withdraw` and `withdrawAll` are the only exits. They pay winnings first, then principal.
- There is no claim function. Prizes are credited to a separate encrypted winnings balance
  during evaluation, so the app's claim button, which carries the amount, sends an ordinary
  withdrawal that looks exactly like every other withdrawal.
- Principal is never locked. Deposits and withdrawals keep working while a draw is running
  and while the contracts are paused.

### Run without us

- Every step of a draw is callable by anyone: close, award, evaluate, finalize, reconcile.
  The app exposes all of them.
- `evaluate` takes a count, never a list of addresses. The walk starts at a point that
  draw's seed decides, so nobody can pick themselves, and pressing the button says nothing
  about whether you won.
- A keeper process runs the whole cycle, one per pool, each on its own account. The pool
  implements Chainlink's automation
  interface for the close step, the only step needing no off-chain data and the only one
  with a deadline, though no upkeep is registered on any of the seven pools yet.
- A stalled keeper costs the pool a draw, never money. Liquidity that was never offered
  stays in its tier, and a late award still books the yield.

---

## Architecture

Three views of the same system: what talks to what, one draw from deposit to reconcile, and
which contracts depend on which. All three are kept current in
[ARCHITECTURE.md](ARCHITECTURE.md), which is the implementation specification.

### System overview

```mermaid
flowchart LR
    Saver["Saver wallet"]
    Public["Public ERC-20<br/>USDC, USDT, WETH,<br/>BRON, ZAMA, tGBP, XAUt"]
    cToken["Confidential token<br/>Zama ERC-7984 wrapper"]
    Relayer["Zama relayer + KMS"]

    subgraph Set["One set per token, seven on Sepolia"]
        Vault["HearthVault<br/>encrypted balances, TWAB,<br/>winner test, winnings"]
        Pool["HearthPrizePool<br/>draw schedule, randomness,<br/>tier liquidity, proofs"]
        Yield["Yield source<br/>Sponsored (Sepolia)<br/>Confidential Vault (mainnet)"]
        Keeper["Keeper process, one per pool<br/>+ Chainlink upkeep interface,<br/>no upkeep registered"]
    end

    Saver -- "wrap" --> cToken
    Public -- "approve" --> cToken
    Saver -- "confidentialTransferAndCall" --> Vault
    Saver -- "withdraw" --> Vault
    Vault -- "scale of the aggregate" --> Pool
    Pool -- "fund(encrypted amount)" --> Vault
    Yield -- "harvest (encrypted transfer)" --> Pool
    Keeper -- "closeDraw, awardDraw,<br/>evaluate, finalize, reconcile" --> Pool
    Keeper -- "public decryption proofs" --> Relayer
    Saver -- "EIP-712 user decryption" --> Relayer
```

The box holds one token's pool. Seven of them run on Sepolia, sharing nothing on chain:
seven vaults, seven prize pools, seven yield sources and seven keeper processes. Addresses
per pool are in the table above and in
[pools and tokens](docs/concepts/pools-and-tokens.md).

### One draw, end to end

```mermaid
sequenceDiagram
    participant S as Saver
    participant V as HearthVault
    participant P as HearthPrizePool
    participant Y as Yield source
    participant K as Keeper
    participant Z as Zama relayer/KMS

    Note over V,K: one token's pool, and each of the seven runs this on its own clock
    S->>V: confidentialTransferAndCall (encrypted deposit)
    V->>V: principal += amount, observations updated
    Note over V,P: period p ends
    K->>P: closeDraw(p)
    P->>P: fix prize sizes, move liquidity into the draw, seed = randEuint64
    P->>Y: harvest()
    Y-->>P: encrypted transfer, handle
    P->>V: scaleFor(p, previous m)
    V-->>P: encrypted scale count and non-empty flag
    P->>Z: makePubliclyDecryptable(seed, scale, nonEmpty, harvested)
    K->>Z: publicDecrypt([seed, scale, nonEmpty, harvested])
    Z-->>K: cleartexts + KMS proof
    K->>P: awardDraw(p, seed, scale, nonEmpty, harvested, proof)
    P->>P: checkSignatures, book harvest, open the window
    K->>V: evaluate(p, count) until the walk wraps
    V->>V: per saver: weight, thresholds, gt, select, clamp
    V->>P: fund(encrypted credited total)
    P->>V: confidentialTransfer(vault, total)
    S->>Z: EIP-712 user decryption of winnings and credit
    S->>V: withdraw(winnings) or withdrawAll()
    V-->>S: confidentialTransfer(principal + winnings)
    Note over V,P: window ends after period p+2
    K->>V: finalizeDraw(p)
    K->>Z: publicDecrypt(carry of each tier that is due)
    K->>P: reconcile(tier, carry, proof)
```

### Contract dependencies

```mermaid
flowchart TD
    Vault["HearthVault (x7)"] --> IERC7984["IERC7984<br/>Zama's confidential token"]
    Vault --> FHE["@fhevm/solidity FHE"]
    Vault --> Pool["HearthPrizePool (x7)"]
    Pool --> IERC7984
    Pool --> FHE
    Pool --> IYield["IYieldSource"]
    IYield --> Sponsored["SponsoredYieldSource (x7)"]
    IYield -.-> CV["ConfidentialVaultYieldSource (mainnet design, not built)"]
    CV -.-> Batcher["Zama DepositVaultBatcherConfidential (mainnet design, not built)"]
    Pool --> Auto["IAutomationCompatible"]
    Vault --> OZ["OpenZeppelin Ownable2Step, Pausable, ReentrancyGuard"]
    Pool --> OZ
```

Solid edges are contracts in this repository. `(x7)` marks the three that are deployed once
per token, each pointing at its own token and at nothing belonging to another pool. The two
dotted nodes are the mainnet yield path: the adapter is specified against Zama's published
batcher interface and no adapter contract is written here.

---

## How the pool and draws work

Time is cut into equal periods. On Sepolia the USDC pool runs an hour and the other six run
six hours, so a visitor sees a full cycle in one sitting. On mainnet a real deployment
would use a day, which is what PoolTogether V5 uses. The period is a constructor argument,
so the same code serves all three.

Draw `p` covers period `p` and is decided entirely by balances held during period `p`.
Every step of it happens during the two periods that follow, which is the window. Closing
has a tighter deadline of its own, half a period before the window ends, so the round trip
to Zama's key management service always has room to land.

**1. Close.** In one transaction the pool fixes each tier's prize size and the liquidity it
is putting up, moves that liquidity into the draw, draws the encrypted seed, asks the vault
where the pool's total weight sits, and harvests the yield source. Four values are then
marked publicly decryptable: the seed, the scale count, a flag saying whether anybody held
a balance at all, and the harvest. That flag on Zama's access control list is one-way and
cannot be revoked, which is what commits the pool to the number the world later sees.

The pool's exact total weight is never published. Publishing it exactly would let anyone
subtract two consecutive totals and recover a lone saver's deposit amount, to the base
unit, from the public timestamp of their own transaction. What the vault publishes instead
is the bracket: the smallest power of two at or above the total, tracked under encryption
by five comparisons per draw. An observer learns one thing per draw, which is whether the
pool crossed a power of two.

**2. Award.** Anyone fetches the four cleartexts from Zama's relayer, which returns them
with a signature from the key management service, the group of parties holding the
network's decryption key. The contract verifies that signature on chain before it believes
a number. Then it books the harvest into the tiers and opens the draw. **This is the moment
the winners are decided.** The seed is now a public number, the bracket is a public number,
and no saver's weight for that period can change any more.

**3. Evaluate.** The vault walks the saver list from a cursor that starts at
`seed mod saverCount`, in list order, doing as many savers as the caller asks for and at
most `4` that need encrypted work. For each one it reads their encrypted
weight, runs the winner test against the public thresholds, and adds the result to their
encrypted winnings. Evaluation decides nothing. It writes down a result that already
exists.

**4. Finalize.** After the window, whatever each tier offered and did not pay is folded
into that tier's encrypted carry, which is added back to the tier's offer at every close.

**5. Reconcile.** Every tier publishes its carry at the finalize of every draw, and the
verified cleartext goes back into that tier's public liquidity, so the pot accumulates
where everyone can see it. Publishing a carry is also what makes that tier's prize count
public, one draw later. The cadence is a per-tier constructor argument: raising it hides
the count for that many draws, at the cost of the money nobody won sitting encrypted and
the public prize dropping to one draw's share until the next reconcile. This deployment
chose the visible jackpot, and says so in [limitations](docs/limitations.md).

### The first seven draws of the USDC pool, read from the pool

Every figure here came from `drawParams(drawId)` on the deployed `usdc` prize pool
`0xA0785AacF30B6FE46EDc53CD8A9db1d94FeF5Df2`, read on 3 September 2026. That pool draws
hourly and is now past draw 66; these are its first seven. The three prize columns are that
draw's `prize[tier]` in USDC and the bracket is its `scaleBits`.

| Draw | Status | Grand | Mid | Frequent | Bracket |
| --- | --- | --- | --- | --- | --- |
| 1 | Awarded | 0.00 | 0.00 | 0.00 | 2^42 |
| 2 | Awarded | 3.56 | 1.78 | 0.89 | 2^43 |
| 3 | Awarded | 3.91 | 1.95 | 0.98 | 2^43 |
| 4 | Awarded | 4.00 | 2.00 | 1.00 | 2^43 |
| 5 | Awarded | 7.59 | 3.79 | 1.34 | 2^43 |
| 6 | Awarded | 8.96 | 4.48 | 1.75 | 2^43 |
| 7 | Awarded | 10.43 | 5.21 | 2.23 | 2^43 |

Three things are readable off that table without taking our word for anything. Draw 1
offers nothing, because a close fixes prize sizes from the liquidity already sitting in the
tiers, and the first close is the transaction that takes the first harvest: that money only
reaches the tiers when draw 1 is awarded, so draw 2 is the first draw with anything to put
up. The step up between draws 4 and 5 is prize money nobody won being folded back by
reconcile and put up again, which is what an every-draw reconcile cadence buys. And the bracket moved from `2^42` to `2^43` between draws 1 and 2
and has stayed there since, which is the encrypted scale tracker correcting itself upward
as the pool filled, with the pool's exact total weight never published at any point.

The winner test itself, for saver `u` in tier `t` of draw `p`, is public arithmetic:

```
prn         = keccak256(abi.encode(R, p, u, t))
r           = prn mod M                                        // M = 2^scaleBits, so no modulo bias
threshold_k = floor((r + k * M) * oddsDen[t] / (oddsNum[t] * count[t]))
```

The saver wins prize `k` when their encrypted weight is strictly greater than
`threshold_k`. The thresholds rise with `k`, so a saver wins prizes `0` through `j-1` for
some `j`. The expected number of prizes is `weight * odds * count / M`, linear in the
saver's share. The only encrypted operation is that comparison, and its result feeds an
encrypted select rather than an if statement, so a winner's transaction and a loser's are
identical.

Full detail: [how a draw works](docs/concepts/how-a-draw-works.md),
[time-weighted balance](docs/concepts/time-weighted-balance.md),
[winner selection](docs/concepts/winner-selection.md),
[prizes and tiers](docs/concepts/prizes-and-tiers.md).

## The confidentiality design

Three questions decide whether a confidential pool deserves anyone's money: what stays
encrypted, is the draw provably fair and weighted by deposit, and is every leak named. Our
position is that naming every seam ourselves is worth more than a claim nobody can check.

### Encrypted versus public

| Value | State | Who can read it |
| --- | --- | --- |
| Your principal | Encrypted | You only, by EIP-712 signature |
| Your unclaimed winnings | Encrypted | You only |
| Your time-weighted weight, per draw | Encrypted | You only |
| Your credit, per draw, and therefore whether you won | Encrypted | You only |
| The amount you deposit | Encrypted end to end | You only |
| The amount you withdraw | Encrypted end to end | You only |
| **The pool's total weight for a period** | **Encrypted, never published** | **Nobody** |
| Each tier's carry between reconciliations | Encrypted | Nobody |
| The bracket the pool's total fell in, a power of two | Public once the period ends | Everyone |
| Whether anybody held a balance at all in the period | Public once the period ends | Everyone |
| The random seed for each draw | Public once the period ends | Everyone |
| The yield harvested each draw | Public once the period ends | Everyone |
| Each tier's prize size and offered plaintext liquidity | Public from the close | Everyone |
| How many prizes the frequent tier paid | Public one draw later | Everyone |
| How many prizes the mid tier paid | Public one draw later | Everyone |
| How many prizes the grand tier paid | Public one draw later | Everyone |
| The list of saver addresses | Public | Everyone |
| When you deposited, withdrew, or were evaluated, and in which batch | Public | Everyone |
| The unfunded counter | Public at finalization | Everyone |
| Sponsor amounts and the drip rate | Public | Everyone |
| The amount you wrap into, or unwrap out of, confidential USDC | Public | Everyone |
| Every threshold any address had to beat, in any tier | Publicly computable | Everyone |

The left column of secrets is exactly the per-person information, plus the two pool-wide
totals that turned out to be per-person information in disguise. The right column is what
an outsider needs in order to check that the draw was honest. That split is the design.

### The leaks, named

1. **Below three savers there is no anonymity set.** With one saver the published bracket
   is that saver's weight to within a factor of two. With two, each can bound the other.
   The app says so whenever the pool is that small.
2. **A balance an observer can pin has no draw privacy at all.** Thresholds are public,
   because they are what makes the draw checkable, and the winner test is a deterministic
   function of one secret and otherwise public data. So anyone who knows your balance
   computes your result in every tier of every draw with no decryption at all. Even a loose
   upper bound proves a definite loss in any tier whose threshold sits above it.
3. **The wrap seam is how a balance gets pinned.** Turning public USDC into confidential
   USDC is a public ERC-20 movement. We measured the correlation on our own earlier
   deployment: reading Sepolia blocks 11528000 to 11618500, three of five deposits sat two
   to four blocks after a public wrap of exactly 100 USDC by the same address. Hearth keeps
   wrap and deposit as separate steps, tells you to wrap a round number, and warns at the
   step where it matters. It cannot remove the seam.
4. **Round-tripping through the wrapper publishes a lower bound on lifetime winnings.**
   For an address whose only confidential USDC counterparty is Hearth, the public unwrapped
   total minus the public wrapped total is a lower bound on everything ever won, and it
   becomes exact once that address has emptied out. Unwrapping to a fresh address does not
   help, because the confidential transfer to it is itself the link.
5. **The published prize counts are a slow measurement.** Each count is a constraint of the
   form "how many of these savers had a weight above their own published threshold", and
   constraints accumulate against a balance that never changes. The tier reconcile cadence
   is the dial that would damp it, and this deployment set it to one. Publishing a tier's
   carry every draw is the same step that hands unwon money back to the public pot, so a
   slower cadence would hide the count and the growing jackpot together. We kept the
   jackpot visible and state the count as a residual.
6. **The token layer is Zama's, not ours.** Confidential USDC is an upgradeable wrapper
   whose owner can appoint observers able to decrypt every amount that moves through the
   token, retroactively, and can deny-list addresses. That covers deposit amounts,
   withdrawal payouts and the one prize-funding transfer per evaluation batch. Live state
   on 2 September 2026: `observerCount()` was 0 and `observers()` was empty. What it does
   not reach is Hearth's own ledger: principal, winnings, weights and credits live in the
   vault, and the token holds no access rights on any of them.
7. **The behavioural residual.** There is no winner-shaped transaction on chain, but a
   saver who withdraws immediately after every draw they won, and never otherwise, hands an
   observer a statistical hint over many draws. It is weak and it is entirely under the
   saver's control. No contract can fix it.

Nothing above is network-level privacy. Your IP address, your RPC provider and your
relayer request are outside the chain and outside this analysis.

Full pages: [what stays private](docs/security/what-stays-private.md),
[threat model](docs/security/threat-model.md),
[randomness and verification](docs/security/randomness-and-verification.md).

---

## The yield source

Prizes are yield. Nobody's principal is ever paid out as a prize, which is what makes the
pool no-loss. Every source implements two functions:

```solidity
interface IYieldSource {
    function harvest() external returns (euint64 transferred); // confidential transfer to the recipient
    function harvestable() external view returns (uint64);      // display only
}
```

`harvest` is synchronous on purpose: it moves whatever the source has ready at that moment.
A source that earns asynchronously prepares the amount ahead of time. Swapping the source
is one owner call, `setYieldSource`, and nothing else in the system knows or cares which
one is attached. A source that reverts does not stop a draw: the harvest is booked as a
trivial encrypted zero, `HarvestFailed` is emitted, and the close succeeds.

### On Sepolia: a sponsored source

Each pool has its own `SponsoredYieldSource`. It holds the confidential token a sponsor
wrapped into it and releases it at `ratePerSecond`: on the USDC pool that is
`5,555 base units a second, which is 19.998 USDC a period`, and every pool's rate is set in
whole tokens an hour so two pools on different clocks can be compared. A sponsorship is a
donation: there is no path to take it back, and only the owner can change the rate. Sponsor
amounts, the rate and every harvest are public, exactly as the yield a PoolTogether vault
contributes is public. What is confidential in Hearth is who saved how much and who won,
never how much money the pool made.

The seven rates and sponsorships are listed in
[pools and tokens](docs/concepts/pools-and-tokens.md). Each is sized to last more than
eighty draws, so no pool needs topping up during a demo.

The source of the money is a mock, and this section is where we say so rather than leaving
anyone to work it out. We looked for a real one first. There is no venue on Sepolia that pays yield on Zama's mock tokens: Aave refuses
those deposits because the supply cap is exceeded, Compound wants Circle's own USDC, and
Zama's own Sepolia vault is idle-only with no yield adapter, which is Zama's own
description of it.

So the source of the money is a mock. The plumbing is not. Every unit of prize money on
every one of the seven live pools was really wrapped, really transferred to that pool as an
encrypted transfer, and really verified by a KMS-signed decryption before it was credited.

### The pool never books a number the source reports

The source performs an encrypted transfer to the pool. The pool, as the recipient, is
allowed on that ciphertext, so it marks the transferred amount publicly decryptable itself
and credits the tiers only after `FHE.checkSignatures` verifies the cleartext. A source
that lies about how much it sent gets nowhere.

This is not theoretical caution. In our previous design the pool booked reserve top-ups
from the amount the caller passed in, while the wrapper mints `amount / rate()`. On the
live deployment `rate()` happened to be 1, so the two agreed and the bug was latent. We
executed it on 2 September 2026 against a test token with 18 decimals, where the wrapper
rate is a million million, and watched the pool believe in a million million times more
prize money than existed. Phantom prize liquidity in a no-loss pool eventually gets paid
out of somebody's principal, which is the one promise the product cannot break.

### On mainnet: Zama's Confidential Vault

Zama ships a protocol whose whole job is earning yield on confidential balances, and it is
the natural mainnet source. `ConfidentialVaultYieldSource` is the adapter in that design,
specified here and not yet written. A batcher sits between confidential tokens and an
ordinary ERC-4626 yield vault: it pools many encrypted deposits, decrypts only the sum,
makes one public deposit, and hands confidential shares back. The adapter joins the deposit
batcher with the pool's confidential USDC and holds shares. The keeper walks a redemption
through the redeem batcher's four stages ahead of time, so that by the next `harvest` the
redeemed confidential USDC is already sitting in the adapter. Every one of those four
stages is permissionless.

Because Sepolia's vault is idle, the adapter is specified against Zama's published batcher
interface and is not implemented in this repository. Saying it is live when it earns
nothing would be a claim anyone could check in a minute. What Hearth would inherit on
mainnet, stated plainly: vault risk in full from the third-party ERC-4626 vault, batch
confidentiality rather than pool confidentiality, and the batcher owner's bounded powers
over batch age and pausing. Detail and addresses: [yield source](docs/concepts/yield-source.md).

---

## Try it in two minutes

Nothing here needs us to be online. Every step of a draw is permissionless.

The app is a console: a rail down the left with one task per screen. The path is a walk down
that rail.

1. Open https://hearth-ram.vercel.app, follow **The pool** in the header to `/app`, and connect a wallet on
   Sepolia. You land in the USDC pool at `/app/usdc`; the token name at the top of the rail
   opens the picker for the other six. **Dashboard** opens with a block marked **Next**
   naming the one thing your wallet is up to, and a button that goes straight to it.
2. **Deposit** in the sidebar. It opens on whichever of its three steps your wallet is
   actually up to. Step 1 is **Get test USDC**, and its button says the same, with that
   pool's own token in the label. That calls `mint` on Zama's mock token, which has no owner
   check and a cap of one million tokens per call. A wallet that already holds some finds
   step 1 already done, with **Get a million more** on it.
3. Step 2 is **Shield your USDC**: type an amount and press **Shield**. That button reads
   **Approve the wrapper** until the wrapper's allowance covers the amount you typed. Step 3
   is **Deposit into the vault**: type an amount and press **Deposit**. The two are separate
   steps on purpose. The deposit amount is encrypted before it leaves your browser.
4. Back on **Dashboard**, press the eye beside **Principal** in **What you hold** and sign the
   message. Your principal and your unclaimed winnings both appear, in the browser only. One
   eye opens both. That signature is not a transaction.
5. **Run a draw** in the sidebar, the row marked **Anyone**. **What the pool is waiting for**
   names the step that is due. Press **Close**, then **Award**, to close and award the last
   finished period yourself, or watch the keeper do it. Award fetches the four decryption
   proofs in the browser and sends the signed cleartexts back to the pool.
6. Press **Advance** once on that same screen. Then open **My draws** and press the eye beside
   **Your prize**, under **Your result** on that draw's card. Your weight and credit for that
   draw appear, and the balance you opened in step 4 stays open; the one signature serves
   both.
7. Open `/verify?pool=usdc`. The public seed and bracket are there, **Thresholds for an
   address** recomputes your thresholds in front of you, and the comparison matches what the
   contract credited. Every pool has its own verify page under the same `pool` parameter.
8. On that same draw card, press the claim button, which carries the amount, such as **Claim
   1.00 USDC**, to withdraw your winnings. Or open **Withdraw**, stay on the **Out of the
   vault** tab, and press **Withdraw everything** to take principal and winnings back in one
   transfer.

The app reads in sixteen languages, chosen from a button in the top bar, with the language
code as the first part of the URL for every language but English, so a reader in Japanese
walks the same path at `/ja/app/usdc`.

### The prove-it command

```bash
npm run prove:sepolia -w @hearth/contracts                    # the usdc pool
npm run prove:sepolia -w @hearth/contracts -- --token weth    # any other pool
```

It runs from one saver's account against the live deployment of the pool you name, and
prints nine numbered steps. Without `--token` it runs the `usdc` pool, which is the pool the
transcript below was recorded against.

Every step is a real transaction or a real decryption: deposit that pool's stake, 500 on
the USDC pool and 0.25 on the WETH one; decrypt your own
principal and check it moved by exactly that; ask for the same handle from a fresh wallet and
show the refusal; drive any pending draw and pick the newest awarded draw the saver holds a
weight in; decrypt your own weight and credit for it; recompute the outcome from the public
seed and bracket through the vault's `thresholdOf` view, and fail if the chain paid more than
the thresholds allow; withdraw exactly the stake plus the winnings through an encrypted amount;
and check the wallet grew by exactly that while the principal is back at its baseline. It
never waits for a period, it leaves the pool as it found it, and it can be run any number of
times.

The run below is the `usdc` pool on 3 September 2026 and took 260 seconds, almost all of it
waiting on the relayer. The lines that say a KMS share did not reconstruct are Zama's key management
service serving one bad share for a given transport key; the command recovers by
regenerating the key and asking again, and every decryption below succeeded.

```
Proving Hearth on sepolia from 0x913446bEb36a56dBDb7b2562bE6b674d1B39Ef2f. Every line below is a real transaction or a real decryption.
  a KMS share did not reconstruct, asking again under a fresh transport key (try 1)
  a KMS share did not reconstruct, asking again under a fresh transport key (try 2)
  a KMS share did not reconstruct, asking again under a fresh transport key (try 3)
  a KMS share did not reconstruct, asking again under a fresh transport key (try 4)
  a KMS share did not reconstruct, asking again under a fresh transport key (try 1)
  a KMS share did not reconstruct, asking again under a fresh transport key (try 2)
  a KMS share did not reconstruct, asking again under a fresh transport key (try 3)
  a KMS share did not reconstruct, asking again under a fresh transport key (try 4)
  minted 500.00 USDC to 0x913446bEb36a56dBDb7b2562bE6b674d1B39Ef2f (tx 0x5d521754e36c479f3b281e8c7bea29c9bd2dbb1d0bcd837a4adb382554a73171, gas 51,756)
  approved the wrapper to take 500.00 USDC from 0x913446bEb36a56dBDb7b2562bE6b674d1B39Ef2f (tx 0x3b8c872fab620b61ff287e94e58799927ec81920813d9e16dd99a2c0e314812c, gas 46,353)
  wrapped 500.00 USDC into confidential USDC for 0x913446bEb36a56dBDb7b2562bE6b674d1B39Ef2f (tx 0x9144936d44c74283375b1a20972f14cc06ece1f78bab2a2099caa86ffd9f4136, gas 342,157)
  deposited an encrypted amount into the vault for 0x913446bEb36a56dBDb7b2562bE6b674d1B39Ef2f (tx 0xbebc1772c2c5388bf1eb77ed34b0ed092625683fe9ca2aa322d37395d196abc5, gas 1,427,319)
1. I took 500.00 of test USDC, wrapped it into confidential USDC and deposited it in period 3 (113.5s)
  a KMS share did not reconstruct, asking again under a fresh transport key (try 1)
  a KMS share did not reconstruct, asking again under a fresh transport key (try 2)
  a KMS share did not reconstruct, asking again under a fresh transport key (try 3)
  a KMS share did not reconstruct, asking again under a fresh transport key (try 4)
  a KMS share did not reconstruct, asking again under a fresh transport key (try 5)
  a KMS share did not reconstruct, asking again under a fresh transport key (try 6)
  a KMS share did not reconstruct, asking again under a fresh transport key (try 7)
  a KMS share did not reconstruct, asking again under a fresh transport key (try 8)
2. I signed an EIP-712 request and decrypted my own principal: 575.00 USDC, up by exactly what I deposited (167.6s)
3. a fresh wallet 0x3d67500910adaE196986eD3729B0B3dcDD9D3769 asked for the same handle and was refused: NotEntitledError: the access control list does not allow 0x3d67500910adaE196986eD3729B0B3dcDD9D3769 to decrypt 0x579371175db8f645ea33ec42678563598b0051d410ff0000000000aa36a70500 on 0x0F93e5db6027b4FB1C76566d24aA2D2E417fAF52 (168.1s)
nothing is closable in period 3, so this pass awards and evaluates what is already open
4. I drove every pending draw from the keeper account and picked draw 2, the newest awarded draw I hold a weight in (173.7s)
5. draw 2 was closed, awarded against a KMS-signed seed and evaluated for every saver, and the 500.00 USDC I just deposited counts from period 3 onward, weighted by the part of that period that was still to run (173.7s)
  a KMS share did not reconstruct, asking again under a fresh transport key (try 1)
  a KMS share did not reconstruct, asking again under a fresh transport key (try 1)
  a KMS share did not reconstruct, asking again under a fresh transport key (try 2)
  a KMS share did not reconstruct, asking again under a fresh transport key (try 3)
6. I decrypted my own weight for that draw, 270,000,000,000 balance-seconds, and my credit, 0.00 USDC (192.7s)
7. I recomputed my own outcome from the public thresholds: 0.00 USDC against the 0.00 credited, which matches to the unit (194.4s)
  a KMS share did not reconstruct, asking again under a fresh transport key (try 1)
  a KMS share did not reconstruct, asking again under a fresh transport key (try 2)
  a KMS share did not reconstruct, asking again under a fresh transport key (try 3)
  a KMS share did not reconstruct, asking again under a fresh transport key (try 4)
  a KMS share did not reconstruct, asking again under a fresh transport key (try 1)
8. I withdrew exactly the 500.00 I deposited plus 0.00 of winnings, in one confidential transfer that looks the same whether or not I won, leaving my 75.00 of seeded principal in the pool (246.2s, gas 1,031,770)
  a KMS share did not reconstruct, asking again under a fresh transport key (try 1)
  a KMS share did not reconstruct, asking again under a fresh transport key (try 2)
  a KMS share did not reconstruct, asking again under a fresh transport key (try 3)
9. my confidential wallet went from 0.00 to 500.00 USDC, up by the 500.00 I put in plus 0.00 of winnings (260.0s)
Every step above happened on chain on sepolia: the deposit, the draw, the KMS-signed seed, the evaluation and the withdrawal. Nothing was mocked and no number came from this script.
```

Executed attack outputs from the self-audit are committed under `docs/security/attacks`.

---

## Quick start

Node 20 or newer. The repository is one npm workspace, so every command runs from the root.

```bash
git clone https://github.com/ramakrishnanhulk20/hearth
cd hearth
npm install
```

### Contracts

```bash
npm run fhe:test                        # pin @fhevm/solidity 0.11.1, the version the local simulator needs
npm run compile                         # hardhat compile, then typechain
npm test                                # the full suite on Zama's mock coprocessor
npm run lint                            # solhint, zero warnings allowed
npm run fhe:ship                        # pin the version the Sepolia build needs, before deploying
```

`npm run fhe:test` and `npm run fhe:ship` switch the `@fhevm/solidity` version in place.
The local Hardhat plugin pins one version and the live network needs another, so run the
matching one before compiling for that target.

### Deploying one pool

A deploy run opens one token's pool, because one deployer nonce runs one deploy. The token
is chosen by `HEARTH_TOKEN`, and every task after it takes `--token`:

```bash
cd packages/contracts
HEARTH_TOKEN=weth npx hardhat deploy --network sepolia          # vault, pool, source, wired
npx hardhat hearth:verify  --network sepolia --token weth       # Etherscan, with the recorded arguments
npx hardhat hearth:seed    --network sepolia --token weth       # sponsor, then five demo savers
npx hardhat hearth:status  --network sepolia --token weth       # the live state, in one screen
```

Leave `HEARTH_TOKEN` and `--token` off and you get `usdc`, the default. An unknown slug
fails with the list of pools that network does have. Every parameter of every pool lives in
`packages/contracts/hearth.config.ts`: period, tiers, initial bracket, drip rate,
sponsorship, the five demo stakes and the keeper's account index. The deploy writes
`deployments/sepolia/hearth.<slug>.json`, and never replaces a contract that already has a
saved deployment, so a second run is a no-op rather than a fresh address that strands live
savers.

Then point the app at what was deployed:

```bash
cd ../web
node scripts/sync-pools.mjs                   # rewrites src/lib/chain/pools.json from the deployment files
```

### Keeper

One process per pool, each signing from its own account index, because two processes on one
account fight over the same nonce.

```bash
npm run build -w @hearth/keeper
npm run plan -w @hearth/keeper          # one pass, sends nothing, prints what it would send
npm run once -w @hearth/keeper          # one pass, live
npm test -w @hearth/keeper              # the keeper's own suite, no network
pm2 start packages/keeper/ecosystem.config.cjs   # all seven, one process per pool
pm2 logs hearth-keeper-weth                      # one pool's log
```

Which pool a process drives is `HEARTH_ADDRESSES_FILE`, which also gives it the token
symbol, the decimals and its `KEEPER_ACCOUNT_INDEX`: `usdc` 1, `usdt` 10, `weth` 11, `bron`
12, `zama` 13, `tgbp` 14, `xaut` 15. `KEEPER_NAME` is the tag every log line carries, so
seven interleaved logs stay readable. Settings, the pm2 file and the Chainlink Automation
registration are in [packages/keeper/README.md](packages/keeper/README.md).

### App

```bash
npm run dev -w @hearth/web              # http://localhost:3000
npm run build -w @hearth/web
npm run typecheck -w @hearth/web
npm run lint -w @hearth/web
```

The app takes its addresses from `packages/web/src/lib/chain/pools.json`, which
`scripts/sync-pools.mjs` generates from the deployment files. The three public environment
variables that used to hold one pool's vault, prize pool and yield source no longer exist;
delete them from any environment that still sets them.

### Operator scripts

Every command named in this README and in the docs exists in `packages/contracts/package.json`,
and each takes `-- --token <slug>` to pick a pool. The deploy is `deploy:sepolia` with
`HEARTH_TOKEN` set, a pool is filled by `seed:sepolia`, one draw is driven by
`draw:sepolia`, the live state is printed by `status:sepolia`, the prove-it command is
`prove:sepolia`, and the executed attack scripts behind the threat model are `audit:sepolia`,
which writes its transcript under `docs/security/attacks`. Each has a `:local` twin that runs
against `hardhat node`. `hearth:spread-gas --keepers 10,11,12,13,14,15` funds several
keepers in one pass, which is what opening six pools at once needs.

### Secrets

Nothing sensitive is hardcoded. `packages/contracts/.env.example` lists every key with a
comment on where its value comes from. The deployer's key and the keeper's key are
different accounts derived from the same seed phrase, so the keeper's hot key holds no
owner powers. Sepolia ETH comes from any public faucet; the Google Cloud, Alchemy and Chainlink faucets
each pay out enough for the whole walkthrough in one request.

---

## Contract reference

Three contracts, listed in the order a draw uses them. Signatures are from the deployed
source, not from the specification.

### HearthVault

Holds every saver's encrypted principal and winnings, keeps the record of how long each
balance was held, runs the winner test, and pays out.

| Function | Who may call | What it does |
| --- | --- | --- |
| `onConfidentialTransferReceived(address, from, amount, bytes)` | That pool's confidential token only, inside `confidentialTransferAndCall` | Credits the amount the token actually moved. Refuses with an encrypted false when the amount or the resulting principal is above `maxPrincipal`, and the token refunds it in the same transaction. Registers the address as a saver. Blocked while paused |
| `openDraw(drawId, offered[3])` | The prize pool only, once per draw | Moves each tier's plaintext offer plus its encrypted carry into the draw's encrypted remaining liquidity |
| `scaleFor(period, scaleBits)` | The prize pool only, after the period ends | Compares the period's aggregate weight against the five powers of two around `scaleBits` and separately against zero, marks both results publicly decryptable, and returns them |
| `evaluate(drawId, count)` | Anyone, any number of times, inside the two-period window | Advances the draw's walk by up to `count` savers and at most `MAX_BATCH` needing encrypted work, credits each one, and pulls the encrypted batch total from the pool |
| `thresholdOf(drawId, saver, tier, index)` | Anyone, view | The public threshold that prize, in that tier, set for that address, plus a flag saying the threshold is beyond 64 bits so no weight can pass it |
| `weightHandle(drawId, saver)` / `creditHandle(drawId, saver)` | Anyone, view | The handles of that saver's weight and credit. Only the saver can decrypt them |
| `confidentialBalanceOf(saver)` / `confidentialWinningsOf(saver)` | Anyone, view | The handles of principal and unclaimed winnings. Only the saver can decrypt them |
| `withdraw(encryptedAmount, inputProof)` | Any saver | Pays winnings first, then principal, clamped to what the saver holds and to what the vault holds. An oversized request returns everything rather than reverting |
| `withdrawAll()` | Any saver | The same, for the whole balance, with no encrypted input |
| `finalizeDraw(drawId)` | Anyone, once, after the window | Folds each tier's unpaid remainder into that tier's carry, publishes the carry of every tier whose cadence is due, and publishes the unfunded counter |
| `abandonDraw(drawId, offered[3])` | The prize pool only | Hands an empty or skipped draw back: the plaintext part to the pool, the encrypted part to the carry |
| `consumeCarry(tier, amount)` | The prize pool only, while that tier's carry is pending | Subtracts the reconciled amount from the carry and clears the publication |
| `setPrizePool(pool)` | Owner, once ever | Wires the pool. A second call reverts |
| `pause()` / `unpause()` | Owner | Stops deposits only. Withdrawals, evaluation and finalization are never pausable |
| `rescueERC20(token, to)` | Owner | Returns a stray public ERC-20. Cannot touch saver balances, which are not ERC-20 |
| `renounceOwnership()` | Disabled | Reverts, so the vault always has an owner able to pause in an incident |

Views the app and the keeper read: `saverCount`, `saverAt`, `isSaver`,
`firstObservationAt`, `evaluated`, `evaluatedCount`, `cursorOf`, `walkOf`, `opened`,
`finalized`, `remainingHandles`, `carryHandle`, `publishedCarry`, `scaleHandles`,
`observationOf`, `unfundedHandle`, `currentPeriod`, `periodOf`, `periodEnd`,
`windowEndsAt`, `maxPrincipal`, `periodLength`, `firstPeriodAt`, `paused`.

Events: `Deposited(saver)`, `Withdrawn(saver)`, `Evaluated(saver, drawId)`,
`DrawFinalized(drawId, unfunded)`, `CarryPublished(drawId, tier, carryHandle)`,
`PrizePoolSet(prizePool)`.

### HearthPrizePool

Runs the clock, the randomness, the prize liquidity and the proofs. All of its accounting
is plaintext: prize sizes are public, winners are not.

| Function | Who may call | What it does |
| --- | --- | --- |
| `closeDraw(drawId)` | Anyone, once per draw, from the start of period `drawId + 1` until `closeDeadline(drawId)` | Fixes every tier's prize size and offer, moves that liquidity into the draw, draws the encrypted seed, asks the vault for the scale, harvests the yield source, and marks the seed and harvest publicly decryptable. Blocked while paused |
| `closeDraw()` | Anyone | The same, for whatever `closableDraw()` names. This is the overload Chainlink Automation calls |
| `checkUpkeep(bytes)` / `performUpkeep(bytes)` | Chainlink Automation, or anyone | The close step only. Every other step needs off-chain data, so automating it on chain would be theatre |
| `awardDraw(drawId, seed, scaleCount, nonEmpty, harvested, proof)` | Anyone, once per draw | Verifies the KMS signature over the four handles in the fixed order `[seed, scale, nonEmpty, harvest]`, books the harvest into the tiers by shares, moves the tracked scale, then opens the draw, marks it `Empty` if nobody held a balance, or marks it `Skipped` if the window has passed. All three paths keep the money |
| `fund(amount)` | The vault only | Transfers the encrypted batch total to the vault and returns what actually moved |
| `reconcile(tier, carry, proof)` | Anyone, while that tier has a published carry | Verifies the KMS signature over the carry handle and books the number back into the tier's plaintext liquidity |
| `drawParams(drawId)` | Anyone, view | Everything the winner test needs: status, seed, `scaleBits`, prize sizes, offers, prize counts and the odds as `zoneMul` and `zoneDiv` |
| `setYieldSource(source)` | Owner | Points the pool at a source. The zero address disables harvesting. Cannot affect any existing balance |
| `pause()` / `unpause()` | Owner | Stops draw closing only. Award, evaluation, finalization and reconciliation continue |
| `rescueERC20(token, to)` | Owner | Reverts for the prize asset, so prize liquidity can never be swept |
| `renounceOwnership()` | Disabled | Reverts |

Views: `drawOf`, `tierOf`, `liquidity`, `scaleBits`, `lastClosedDraw`, `reconcileEvery`,
`closableDraw`, `canClose`, `closeDeadline`, `windowEndsAt`, `currentPeriod`,
`yieldSource`, `periodLength`, `firstPeriodAt`, `UTILISATION_BPS`, `MAX_SCALE_BITS`,
`paused`.

Events: `DrawClosed(drawId, seedHandle, scaleHandle, nonEmptyHandle, harvestHandle,
prize[3], offered[3])`, `DrawAwarded(drawId, seed, scaleBits, harvested)`,
`DrawEmpty(drawId, harvested)`, `DrawSkipped(drawId, harvested)`,
`TierReconciled(drawId, tier, carry)`, `HarvestFailed(drawId)`,
`YieldSourceSet(yieldSource)`, `Funded(amount)`.

### SponsoredYieldSource

| Function | Who may call | What it does |
| --- | --- | --- |
| `sponsor(amount)` | Anyone | Pulls the public token rounded down to a multiple of the wrapper rate, wraps it, and books exactly the units the wrapper minted. Cannot be undone |
| `harvest()` | The recipient pool only | Moves everything accrued as one confidential transfer and returns the encrypted amount the token says moved. Returns an encrypted zero rather than reverting when nothing has accrued |
| `harvestable()` | Anyone, view | What `harvest` would move right now. For display. The pool never uses it for accounting |
| `setRate(ratePerSecond)` | Owner | Settles accrual to now at the old rate, then changes it |
| `renounceOwnership()` | Disabled | Reverts, because a source with no owner could never change its rate again |

Views: `balance`, `accrued`, `lastAccrualAt`, `ratePerSecond`, `asset`, `underlying`,
`recipient`. Events: `Sponsored(from, amount, balance)`, `RateChanged(ratePerSecond)`,
`Harvested(amount, balance)`.

### Deploy order and constructors

```
HearthVault(IERC7984 asset, uint256 periodLength, uint256 firstPeriodAt, address owner)
HearthPrizePool(IHearthVault vault, IERC7984 asset, Tier[3] tiers, uint8 initialScaleBits, address owner)
    Tier = { uint32 prizeCount; uint64 oddsNumerator; uint64 oddsDenominator; uint16 shares; uint16 reconcileEvery }
SponsoredYieldSource(IERC7984ERC20Wrapper asset, address recipient, uint64 ratePerSecond, address owner)
```

Deploy the vault, then the pool, then `vault.setPrizePool(pool)`, then the source with the
pool as recipient, then `pool.setYieldSource(source)`, then sponsor it. One run does one
token, and `HEARTH_TOKEN` picks which.

There are two tier sets, because there are two clocks. The hourly `usdc` pool runs grand
count 1 at odds 1/24 with 40 shares, mid count 1 at odds 1/6 with 20 shares, and frequent
count 4 at odds 1 with 40 shares. The six-hour pools run the same counts and shares at odds
1/4 and 1/2, so the grand prize still pays about once a day and the mid prize about twice a
day. All three tiers of every pool reconcile every draw. Utilisation is fixed at 50 percent,
following PoolTogether V5. Full parameter meanings and a candidate mainnet set:
[deploying](docs/operations/deploying.md).

---

## Tests

```
  Hearth fairness
  239 scored draws in 74s, frequent tier paid 601 of 956 nominal prizes (W/M 0.6344, expected 606.5)
  saver 0 stake 51.61% won 302 frequent prizes, share 50.25%, expected 313.0
  saver 1 stake 25.81% won 154 frequent prizes, share 25.62%, expected 156.5
  saver 2 stake 12.90% won 85 frequent prizes, share 14.14%, expected 78.3
  saver 3 stake 6.45% won 40 frequent prizes, share 6.66%, expected 39.1
  saver 4 stake 3.23% won 20 frequent prizes, share 3.33%, expected 19.6
  grand 4 prizes / 31.2 USDC, mid 25 / 247.533, frequent 601 / 3656.931005, credited 3935.664005
  tier 0 prize size ranged 7.774 to 841.8865 USDC across the sample
  tier 1 prize size ranged 3.887 to 357.60725 USDC across the sample
  tier 2 prize size ranged 1.95 to 8.996772 USDC across the sample
  grand tier paid 4 against 6.32 expected, inside [0, 18]; mid tier 25 against 25.27, inside [9, 46]
    ✔ pays each saver a share of the prizes that tracks their share of the pool (74735ms)
    ✔ never pays a saver for a period that ended before they arrived (397ms)

  Hearth
    ✔ runs deposit, close, award, evaluate, finalize, reconcile and withdraw with the books balanced (1503ms)
    ✔ fixes prize sizes at the close, before the seed exists, and the award leaves them alone (152ms)
    ✔ walks the saver list from the seed in fixed batches, once per saver (645ms)
    ✔ skips a saver who joined after the draw's period without any encrypted work (271ms)
    ✔ moves the published scale up to the aggregate when it starts far below (744ms)
    ✔ brings the published scale down when it starts far above (646ms)
    ✔ hands a period with no savers back to the tiers and keeps the carry (426ms)
    ✔ books the harvest and hands back the liquidity of an award that missed its window (151ms)
    ✔ refuses a close after the deadline and still allows one at the start of the last period (108ms)
    ✔ publishes each tier's carry on its own cadence and books it back once (410ms)
    ✔ matches an off-chain mirror of every threshold, and pays what the mirror says (666ms)
    ✔ lets a saver read their own weight and credit and keeps a stranger out (273ms)
    ✔ keeps closing when the yield source reverts, and books that draw as a zero harvest (111ms)
    ✔ proves a harvest of nothing when no yield source is wired (120ms)
    ✔ weights a mid-period deposit by the fraction of the period it was present (225ms)
    ✔ keeps three observations, so a draw can still be weighed two periods later (157ms)
    ✔ refuses a deposit that would exceed the per-saver cap by refunding it (73ms)
    ✔ pauses deposits and draw closing but never withdrawals (241ms)
    ✔ reports the closable draw to the upkeep and closes exactly that one (72ms)
    ✔ stops a batch at the coprocessor budget and resumes from the cursor (464ms)
    ✔ rejects a forged award proof (146ms)
    ✔ refuses a tier configuration or a scale the pool cannot run

  Hearth invariants
  period  1                                                 vault 1650.00 liquidity 0.00 carry 0.00
  period  2  draw 1 awarded 2/6 evaluated                   vault 2161.00 liquidity 120.80 carry 0.00
  period  3  draw 2 awarded 6/6 evaluated W/M 0.859         vault 2301.58 liquidity 120.00 carry 0.00
  period  4  draw 3 closed, award held back W/M 0.588 draw 1 finalized vault 2138.58 liquidity 0.00 carry 0.00
  period  5  draw 4 awarded 6/6 evaluated draw 2 finalized  vault 1673.12 liquidity 156.04 carry 72.48
  period  6  draw 5 awarded 6/6 evaluated W/M 0.580 draw 3 skipped vault 1613.01 liquidity 360.20 carry 0.00
  period  7  draw 6 awarded 2/6 evaluated W/M 0.910 draw 4 finalized vault 1976.04 liquidity 119.60 carry 0.00
  period  8   W/M 0.866 draw 5 finalized                    vault 2548.07 liquidity 182.72 carry 144.36
  period  9  draw 8 awarded 2/6 evaluated draw 6 finalized  vault 2913.94 liquidity 348.06 carry 144.08
  period 10  draw 9 awarded 6/6 evaluated W/M 0.657         vault 2611.12 liquidity 120.40 carry 0.00
  period 11  draw 10 awarded 2/6 evaluated W/M 0.754 draw 8 finalized vault 2677.16 liquidity 188.95 carry 216.12
  period 12  draw 11 awarded 2/6 evaluated W/M 0.641 draw 9 finalized vault 2867.27 liquidity 204.22 carry 324.10
  period 13  draw 12 awarded 6/6 evaluated W/M 0.655 draw 10 finalized vault 3089.98 liquidity 149.90 carry 72.24
  period 14  draw 13 awarded 6/6 evaluated W/M 0.709 draw 11 finalized vault 3392.99 liquidity 207.89 carry 287.88
  period 15  draw 14 awarded 6/6 evaluated W/M 0.750 draw 12 finalized vault 4043.93 liquidity 327.33 carry 264.12
  period 16  draw 15 awarded 6/6 evaluated W/M 0.822 draw 13 finalized vault 3637.70 liquidity 158.81 carry 144.12
  period 17  draw 16 awarded 6/6 evaluated W/M 0.976 draw 14 finalized vault 4250.44 liquidity 171.36 carry 359.88
  period 18  draw 17 awarded 6/6 evaluated W/M 0.852 draw 15 finalized vault 4922.00 liquidity 156.59 carry 444.30
  period 19  draw 18 awarded 2/6 evaluated W/M 0.506 draw 16 finalized vault 4396.40 liquidity 185.40 carry 216.00
  period 20  draw 19 awarded 2/6 evaluated W/M 0.591 draw 17 finalized vault 4471.99 liquidity 169.16 carry 432.12
  period 21  draw 20 awarded 2/6 evaluated W/M 0.549 draw 18 finalized vault 4502.60 liquidity 329.40 carry 360.12
  period 22  draw 21 awarded 6/6 evaluated W/M 0.557 draw 19 finalized vault 4171.51 liquidity 219.12 carry 288.12
  period 23  draw 22 awarded 2/6 evaluated W/M 0.565 draw 20 finalized vault 4455.29 liquidity 180.47 carry 503.88
  period 24  draw 23 awarded 6/6 evaluated W/M 0.515 draw 21 finalized vault 5047.65 liquidity 221.30 carry 588.42
  period 25  draw 24 awarded 6/6 evaluated W/M 0.549 draw 22 finalized vault 5374.24 liquidity 230.14 carry 360.12
  period 26  draw 25 awarded 6/6 evaluated W/M 0.622 draw 23 finalized vault 3995.38 liquidity 174.36 carry 575.64
  period 27  draw 26 awarded 6/6 evaluated W/M 0.656 draw 24 finalized vault 4447.68 liquidity 855.53 carry 0.00
  211 checks over 27 periods, deposited 8893.00 USDC, withdrew 9915.74, credited 1022.74, 24s
    ✔ keeps every balance, remainder and carry accounted for under a random sequence of actions (23827ms)

  libraries
    Periods
      ✔ counts periods from one, starting at the first timestamp
      ✔ puts anything before the first timestamp in period zero
      ✔ bounds a period so that its end is the next period's start

  SponsoredYieldSource
    ✔ books exactly what the wrapper mints when sponsored
    ✔ refuses an empty sponsorship
    ✔ accrues at the rate and never beyond the sponsored balance
    ✔ only the recipient may harvest, and the harvest lands in its confidential balance (140ms)
    ✔ returns an encrypted zero without reverting when nothing has accrued
    ✔ settles accrual at the old rate before a rate change
    ✔ keeps an owner forever

  35 passing (2m)
```

The suite runs against Zama's mock coprocessor through the Hardhat plugin, so every
encrypted operation, every access control grant and every KMS-signed decryption is really
performed rather than stubbed out. What it covers, one line per test:

- One full cycle with the books balanced: deposit, close, award, evaluate, finalize,
  reconcile, withdraw.
- Prize sizes are fixed at the close, before the seed exists, and the award leaves them
  alone.
- The evaluation walk starts at the seed, runs in fixed batches, and reaches each saver
  exactly once. A batch stops at the coprocessor budget and the next call resumes from the
  cursor.
- A saver who joined after the draw's period is skipped with no encrypted work at all.
- The published scale climbs to the aggregate from far below and comes down from far above.
- A period nobody held a balance in hands its liquidity back and keeps the carry.
- An award that missed its window still books the harvest and still hands the liquidity
  back.
- A close after the deadline is refused, and a close at the start of the last period is
  allowed.
- Each tier publishes its carry on its own cadence and it is booked back exactly once.
- Every threshold matches an off-chain mirror, and what is paid matches what the mirror
  says.
- A saver reads their own weight and credit; a stranger is refused.
- A reverting yield source does not stop a close, and a pool with no source books a zero.
- A mid-period deposit is weighted by the fraction of the period it was present.
- Three observations are enough to weigh a draw two periods later.
- A deposit above the per-saver cap is refused by refunding it.
- Pause stops deposits and closing and never stops withdrawals.
- The Chainlink upkeep reports the closable draw and closes exactly that one.
- A forged award proof is rejected, and a tier configuration or a scale the pool cannot run
  is refused at deployment.
- Winners per tier over 239 scored draws track the stated odds and each saver's share of
  the pool (`test/Fairness.ts`).
- Every balance, remainder and carry stays accounted for under a random sequence of 27
  periods of deposits, withdrawals and draw actions (`test/Invariants.ts`).
- The period arithmetic and the sponsored source have their own files.

Not covered. The property and invariant runs are samples, not exhaustive proof: one
randomised sequence of 27 periods and one run of 240 draws, 239 of them scored, so they
bound behaviour rather than prove it. There is no Foundry invariant campaign and no formal
verification. The invariant walk does not reach deposits above the per-saver cap, the pause
path, a hostile token, or the amounts the winner test decides, which it treats as
arbitrary. The fairness run does not reach the statistical quality of
`FHE.randEuint64` itself, since the mock draws the seed, so it measures the winner test
given a seed rather than the seed, and it does not reach savers who move their balance
mid-run, reconcile cadences other than the one it runs, or the over-subscription clamp
actually biting, which five savers cannot force at this tier set. Nor does this suite
touch the live relayer, the live key management service, real gas, real coprocessor
prices, nonce behaviour under a reorg, or anything Zama's own contracts do internally.
Those belong to the Sepolia deployment and the prove-it command. The keeper has its own
suite, described in [packages/keeper/README.md](packages/keeper/README.md), which touches
no network at all.

---

## What it costs

Figures are live Sepolia receipts at 1 gwei, the Sepolia base fee at deployment, quoted for a pool of
5 savers.

| What a user does | Gas | In plain words |
| --- | --- | --- |
| Wrap USDC into confidential USDC | Zama's wrapper, not ours | Two calls, an approve and a wrap |
| Deposit | `1,515,752` | One transaction, carrying an encrypted amount and its proof |
| Reveal your balance or winnings | None | An off-chain signature. No transaction |
| Withdraw, whether or not it includes a prize | `1,031,770` | One confidential transfer |

| What a draw costs | Transactions | Gas each |
| --- | --- | --- |
| Close | 1 | `1,422,474` |
| Award | 1 | `435,578` |
| Evaluate, a full batch of 4 | `floor(savers / 4)`, here 1 | `3,417,699` |
| Evaluate, the last partial batch | 0 or 1, here 1 carrying one saver | `1,291,192` for one saver, plus `708,836` for each extra |
| Finalize | 1 | `509,463` |
| Reconcile | 3 on this deployment, one per tier, since all three reconcile every draw | `459,994` |

A whole draw at 5 savers is `8,456,388` gas, about `0.0085 ETH`. That total is the rows
above summed at the counts in the middle column: one close, one award, a full evaluate
batch of 4, a second evaluate batch carrying the fifth saver, one finalize and three
reconciles. At a one-hour period that is 24 draws a day and `0.2030 ETH`; at the daily
period a mainnet deployment would use it is `0.0085 ETH`. That figure is why six of the
seven Sepolia pools draw every six hours: hourly, all seven would cost about `1.43 ETH` a
day, and at four draws a day for six of them the whole set costs about `0.41 ETH`. Whoever
sends the transactions pays. Nothing on chain
caps evaluation, so the keeper caps the gas price it will pay rather than the work it will
do: above `KEEPER_MAX_FEE_GWEI` it sends nothing at all that tick, and below it the keeper
runs the walk to the end. Any saver can push the walk further from the app.

One more saver in a batch costs `708,836` gas, measured live on Sepolia; a batch that
carries only one saver costs `1,291,192`, because the fixed part of the call is paid either
way. In homomorphic compute units a saver is `3,674,128` on the mock coprocessor's price
table, which is the only place the figure is readable: a live receipt does not report them. Zama caps one transaction on Sepolia at 20,000,000 compute units with 5,000,000 of
sequential depth. The batch size was measured against the coprocessor's price table on the
Sepolia tier set at 748,032 units of fixed cost per call plus 3,674,128 per saver, which
puts four savers at 15,444,544 units and five at 19,118,672. Hearth budgets 18,000,000 and
4,500,000 so a heavier tier set still fits, so the constant is `4`. `evaluate`
accepts any count, so if Zama reprices an operation the keeper drops to a smaller batch
with no redeploy.

---

## Project structure

```
hearth/
├── packages/
│   ├── contracts/        Solidity, Hardhat, tests, deploy scripts and tasks
│   │   ├── contracts/    HearthVault, HearthPrizePool, SponsoredYieldSource,
│   │   │                 interfaces, the Periods library, mocks
│   │   ├── deploy/       repeatable deployment, one pool per run
│   │   ├── deployments/  the address file each pool's deploy wrote
│   │   ├── test/         the mock-coprocessor suite
│   │   ├── tasks/        deploy, seed, status, draw, the prove-it command and the
│   │   │                 executed attack scripts
│   │   └── hearth.config.ts   every pool's parameters, on one page
│   ├── web/              the Next.js app and the documentation site it serves
│   └── keeper/           the script that drives draws, one process per pool, with its
│                         own suite and the pm2 file for all seven
├── docs/                 the written record: getting started, concepts, security, operations
├── ARCHITECTURE.md       the implementation specification, with the three diagrams
└── README.md
```

---

## Tech stack

| Layer | What | Version |
| --- | --- | --- |
| Encrypted computation | `@fhevm/solidity` | 0.11.1 for the local simulator, switched to 0.13.2 for the Sepolia build by `npm run fhe:ship` |
| Confidential token | `@openzeppelin/confidential-contracts` (ERC-7984) | 0.5.3 |
| Base libraries | `@openzeppelin/contracts` (Ownable2Step, Pausable, ReentrancyGuard, SafeERC20) | ^5.6.1 |
| Language | Solidity | 0.8.27 |
| Contract tooling | Hardhat, `@fhevm/hardhat-plugin`, `@fhevm/mock-utils`, hardhat-deploy, TypeChain, solhint | 2.28.6, 0.4.2, 0.4.2, 0.11.45, 8.3.2, 6.2.1 |
| Local FHE mock | `@zama-fhe/relayer-sdk`, required by the Hardhat plugin and used only by the local simulator | 0.4.1, the exact version `@fhevm/hardhat-plugin` 0.4.2 checks for |
| Encryption and decryption client | `@zama-fhe/sdk` in the operator tasks, the keeper and the app | 3.5.1 |
| App | Next.js App Router, React, Tailwind, wagmi, viem | 16.3.4, 19.2.8, 3.4.17, 3.7.7, 2.56.3 |
| App motion | Framer Motion, React Three Fiber, drei, postprocessing, Lenis | 13.2.0, 9.7.0, 10.7.8, 3.1.1, 1.3.26 |
| App languages | `next-intl`, the locale code as the first URL segment for all but English | 4.14.2 |
| Keeper | Node 20 with its own test runner, ethers 6.16.0, one process per pool under pm2 | No framework |
| Automation | Chainlink time-based upkeep, interface declared locally | Two selectors, no package |

---

## Security

Hearth has not been audited by a third party. It is self-audited, and the honest substitute
is written down rather than claimed.

**Two adversarial design reviews.** The first, on 2 September 2026, found folded prize
counts, unverified harvests, a one-period evaluation window that a slow relayer could lose
a draw to, a wrong overflow claim, undefined evaluation semantics, and missing events and
views. The second, on 3 September 2026, found seven more, each of which changed the design:
publishing the pool's exact aggregate weight recovers a lone mover's deposit exactly, prize
sizes fixed after the seed can be resized by whoever reads it first, a last-block close
strands a draw forever, self-evaluation is a winner tell as loud as a claim function,
per-draw jackpot counts identify a winner out of the small set eligible that hour,
withdrawals assumed a token that clamps, and the deposit cap check could itself wrap.
`ARCHITECTURE.md` section 14 lists every one and what replaced it.

**An executed audit of the previous design.** Before this rebuild, Hearth was a single
contract that weighted savers by their balance at the instant of the draw. We attacked it
rather than reasoning about it, and six of the eight findings were reproduced in running
code: a flash deposit won 19 of 20 draws and drained a 5,000 USDC reserve with the whole
cycle fitting in one transaction at 2,189,992 gas; winner and loser claims cost an
identical 391,944 gas but only a winner had a reason to send one; a house ticket's
winnings handle was republished as publicly decryptable every draw; the pool's total was
never published, so no outsider could check a draw at all; reserve top-ups were booked from
a reported number; registration griefing was free; the wrap seam was unmitigated and
measurably so; and the live pool sat 26 hours with an openable draw because permissionless
is not the same as automated. Every one of those is closed by construction in this design,
and the table of what closed each is in the
[threat model](docs/security/threat-model.md).

**Owner powers, in full.** A pause that stops deposits and draw closing and never stops
withdrawals, evaluation, award, finalization or reconciliation. A yield-source setter that
cannot affect any existing balance. A rescue path for stray public tokens that reverts for
the prize asset. Two-step ownership transfer with renouncing disabled. The owner cannot
read any saver's principal, winnings, weight or credit, cannot change a draw's outcome,
cannot move anyone's money, and cannot upgrade the contracts, because there is no upgrade
path and no proxy.

**Threat model:** [docs/security/threat-model.md](docs/security/threat-model.md). Nine
attackers, what each wants, what stops them, and what does not, with the last column being
the one worth reading. Executed attack outputs land under `docs/security/attacks`.

**Static analysis:** [docs/security/static-analysis.md](docs/security/static-analysis.md).
slither reports 85 results on these contracts and solhint none; the page gives the one reason
behind each family and names the two results that deserved a second look.

### Limitations

The full numbered list is [docs/limitations.md](docs/limitations.md). In short:

1. Evaluation is batched at `4` savers needing encrypted work per transaction.
   Participation is not capped; only the batch is.
2. A saver the evaluation walk does not reach inside the two-period window forfeits that
   draw, as an unclaimed PoolTogether V5 prize expires.
3. One saver cannot hold more than `(2^64 - 1) / periodLength`, about 5 billion tokens at an
   hourly period and about 213 million at a daily one.
4. No reserve tier. The 50 percent utilisation rate is the only cushion for an
   over-subscribed tier.
5. Grand-tier odds are measured over one period, so a large holder who joins for one period
   takes a full proportional shot at a pot that took 24 periods to build.
6. Privacy needs three or more savers. Below that the published bracket pins a weight to
   within a factor of two.
7. The token layer is Zama's wrapper, and its observer, deny-list and upgrade powers apply
   to amounts crossing it.
8. Draws depend on somebody sending transactions. Nothing on chain fires by itself.
9. Yield on Sepolia is sponsored, not earned.
10. The wrap seam, and what a pinned balance costs in every later draw.
11. The walk order decides who is short in an over-subscribed tier.
12. The draw runs against a bracket, so a tier pays between half and all of its nominal
    prize count each draw and prize sizes settle correspondingly higher.
13. Cumulative winnings become public if you round-trip through the wrapper in full.
14. A balance that never changes is narrowed slowly by the published prize counts.

---

## Licence

MIT. See [LICENSE](LICENSE).

## Acknowledgments

- **Zama**, for the Protocol this is built on: the FHEVM Solidity library and its encrypted
  integers, `FHE.randEuint64` for randomness generated inside the coprocessor, the on-chain
  access control list, EIP-712 user decryption and KMS-signed public decryption verified on
  chain with `FHE.checkSignatures`, the relayer, and the confidential USDC ERC-7984 wrapper
  that Hearth uses as its asset rather than minting one of its own.
- **OpenZeppelin**, for the confidential contracts implementing ERC-7984 and for the base
  libraries this builds on rather than hand-rolling.
- **PoolTogether V5**, as the design reference. The time-weighted average balance, the
  tiered prizes, the per-saver winner test and the 50 percent utilisation rate are theirs.
  Every place Hearth deviates is named in
  [prizes and tiers](docs/concepts/prizes-and-tiers.md) and in `ARCHITECTURE.md` section 14.
  No PoolTogether code is used: their implementation is GPL-3 and this repository is MIT,
  so every line here is written fresh.
- **Chainlink**, for the Automation interface the pool implements for the close step.
