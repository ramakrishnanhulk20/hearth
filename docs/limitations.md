# Limitations

Every limitation we know about, numbered, in one place. Other pages refer to these
numbers.

The reason this page exists is simple. A confidentiality claim is only worth as much as
the seams the author was willing to name. Anything below that surprises you later is our
failure, not a discovery.

## 1. Evaluation is batched, and batches are capped

The winner test runs over encrypted numbers, and Zama caps a single transaction at
20,000,000 compute units with 5,000,000 in sequential depth on Sepolia. One saver's
evaluation costs `{{HCU_EVALUATE}}` of that, so at most `{{MAX_BATCH}}` savers fit in one
call.

**What it means:** a pool with many savers needs many transactions per draw. The cost
grows linearly with the number of savers, and it is paid in gas by whoever evaluates.

**What it does not mean:** there is no cap on how many savers the pool supports. Several
projects in this field cap participation at 32 addresses. Hearth does not cap
participation at all; it caps how many fit in one transaction.

## 2. The two-period window, and prizes that expire

A draw must be closed, awarded and evaluated during the two periods that follow it. On
Sepolia that is one hour. After that the window shuts.

**What it means:** a saver who is not evaluated inside the window forfeits that draw, even
if their thresholds say they won. Their share of the tier's liquidity returns to the tier
at reconciliation and funds a later draw. This is the same behaviour as an unclaimed
PoolTogether V5 prize expiring, and it is the only case in the system where a real saver
loses something they might have had.

**Why the window exists:** it bounds how far back the vault must remember balances, which
is what makes three stored observations per saver sufficient. A one-period window was
tried and was too fragile at 30-minute periods against a slow relayer.

**What reduces it:** the keeper evaluates everyone, and any saver can evaluate themselves
from the app at any point inside the window.

## 3. There is a cap on how much one saver can hold

Deposits are refused above `maxPrincipal = (2^64 - 1) / periodLength`. At a 30-minute
period that is about 10 billion USDC. At a daily period it is about 213 million USDC.

**What it means:** the cap is real, and at a daily period on mainnet it is a number a
large institution could reach.

**Why it exists:** encrypted values here are 64-bit, and a saver's accumulated
balance-seconds must stay inside that. An encrypted overflow does not revert and nobody
sees it happen, so the cap is enforced at the door.

**How the refusal behaves:** it is returned as an encrypted false and the token refunds
the deposit in the same transaction, so hitting the cap does not disclose your balance.

## 4. No reserve tier

PoolTogether V5 keeps a reserve share that tops up an over-subscribed tier. Hearth has no
reserve. The 50 percent utilisation rate is the only cushion.

**What it means:** when a tier hands out more prizes than it can fund, which happens in
roughly 2 percent of draws for the frequent tier, the last winners in evaluation order
get less or nothing rather than being topped up.

**Why:** a reserve needs an owner-controlled withdrawal path to be useful, and every owner
power in a confidential pool is something a saver has to trust.

## 5. Grand-tier odds are measured over one period

V5 measures the grand tier's odds over the tier's whole accrual window. Hearth measures
them over a single period, like every other tier.

**What it means:** a large holder who joins for one period takes a full proportional shot
at a pot that took 48 periods to build. Someone who saved through all 48 has no
additional claim on it.

**The known fix, deferred:** accumulate balance-seconds since the last grand payout and
weight the grand tier by that. It adds a second accumulator with its own overflow
analysis, so it is a version-two change rather than an unproven addition to version one.

## 6. Privacy needs three or more savers

The pool's total time-weighted balance is published every draw, because without it nobody
can verify anything.

**What it means:** with one saver, the published total is that saver's weight. With two,
each can subtract their own and learn the other's exactly. Below three savers there is no
anonymity set. There is also a weaker second-order version: differencing consecutive
published totals bounds the change of whoever moved between them, which bites in a quiet
pool.

**What the app does:** it states this whenever the pool has fewer than three savers,
rather than showing a privacy claim that is not true at that size.

## 7. The token layer is Zama's, and its powers apply

Hearth's asset is Zama's confidential USDC wrapper, not ours.

**What it means:** its owner can appoint observers able to decrypt every amount that moves
through the token, which includes deposit amounts, withdrawal payouts and the pool's own
balance. The owner can block an address, and the contract is upgradeable. As of 2
September 2026 there were no observers and the pauser was unset.

**What it does not reach:** Hearth's own ledger. Principal, winnings, per-draw weights and
per-draw credits live in the vault, and the token holds no access rights on them.

**The alternative we rejected:** writing our own confidential token. That swaps a known,
audited, Zama-operated contract for one we grade ourselves.

## 8. Draws depend on somebody sending transactions

Nothing on chain fires by itself.

**What it means:** if no keeper runs and no saver acts, a draw is skipped and that period
pays no prize.

**What it does not mean:** money at risk. A skipped draw keeps its liquidity in the tiers,
the harvest is booked by a late award, and deposits and withdrawals are unaffected
throughout.

**What reduces it:** every step is permissionless, the app exposes them, and Chainlink
Automation covers the close step, which is the only step needing no off-chain data.

## 9. Yield on Sepolia is sponsored, not earned

The live pool's prize money comes from a sponsor-funded balance that drips at a set rate.

**What it means:** it is not real yield. Nobody is earning it from lending or from a
vault. When the sponsored balance runs out, prizes stop.

**Why:** there is no venue on Sepolia that pays yield on Zama's mock USDC. Aave refuses
those deposits, Compound wants Circle's own USDC, and Zama's Sepolia vault is idle-only
with no yield adapter, which is Zama's own description of it.

**What is real about it:** every unit of prize money was genuinely wrapped, genuinely
transferred to the pool as an encrypted transfer, and genuinely verified through a
KMS-signed decryption before being credited. The source of the money is a mock. The
plumbing is not.

## 10. The wrap seam

Turning public USDC into confidential USDC is a public transfer, so the amount is
visible.

**What it means:** a saver who wraps and immediately deposits the same amount has
published an upper bound on their deposit. We measured this on our own earlier
deployment: three of five live deposits sat two to four blocks after a public wrap of
exactly 100 USDC.

**What Hearth does:** keeps wrap and deposit as separate steps, explains why at the wrap
step, and lets a saver hold a standing confidential balance.

**What Hearth cannot do:** remove it. There is no confidential way to convert a public
token.

## 11. Evaluation order decides who is short in an over-subscribed tier

When a tier runs out mid-draw, the saver being evaluated at that moment gets the
remainder and later ones get nothing from that tier.

**What it means:** in the rare over-subscribed draw, the order the keeper happens to use
decides who is short-changed. It is not random and it is not weighted.

**What reduces it:** evaluation is permissionless, so a saver who cares can put themselves
first as soon as the draw is awarded. The affected saver can also see it, because their
weight and their credit for the draw are both decryptable by them.

## Not a limitation, but worth stating plainly

- **A large saver wins often.** Odds are proportional to time-weighted balance, so someone
  holding a lot for a long time wins a lot. That is the design, not a flaw.
- **Prize sizes and prize counts are public.** They always were in PoolTogether. What is
  confidential here is who won, not how much the pool earned.
- **Hearth has not been audited by a third party.** It is self-audited with executed
  attacks and property tests, and the [threat model](security/threat-model.md) is the
  honest substitute rather than a replacement.
