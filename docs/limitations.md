# Limitations

Every limitation we know about, numbered, in one place. Other pages refer to these
numbers.

The reason this page exists is simple. A confidentiality claim is only worth as much as
the seams the author was willing to name. Anything below that surprises you later is our
failure, not a discovery.

## 1. Evaluation is batched, and batches are capped

The winner test runs over encrypted numbers, and Zama caps a single transaction at
20,000,000 compute units with 5,000,000 in sequential depth on Sepolia. One saver's
evaluation costs `{{HCU_EVALUATE}}` of that, so at most `{{MAX_BATCH}}` savers needing
encrypted work fit in one call.

**What it means:** a pool with many savers needs many transactions per draw. The cost
grows linearly with the number of savers, and it is paid in gas by whoever evaluates.

**What it does not mean:** there is no cap on how many savers the pool supports. Several
projects in this field cap participation at 32 addresses. Hearth does not cap
participation at all; it caps how many fit in one transaction. `evaluate` takes any count,
so a smaller batch needs no redeploy.

## 2. The two-period window, and prizes that expire

A draw must be closed, awarded and evaluated during the two periods that follow it. On
Sepolia that is two hours. Closing has a tighter deadline still: the middle of the second
of those periods, so that the decryption round trip and the award always have at least
half a period left. After the window shuts, the draw is over.

**What it means:** a saver the evaluation walk does not reach inside the window forfeits
that draw, even if their thresholds say they won. Their share of the tier's liquidity
folds into the tier's carry and funds a later draw. This is the same behaviour as an
unclaimed PoolTogether V5 prize expiring, and it is the only case in the system where a
real saver loses something they might have had.

**Why the window exists:** it bounds how far back the vault must remember balances, which
is what makes three stored observations per saver sufficient. A one-period window was
tried and was too fragile against a slow relayer.

**What reduces it:** the keeper walks the whole list, anyone can advance the walk further
from the app, and the walk starts at a different point every draw, so nobody sits
permanently at the back of the queue.

## 3. There is a cap on how much one saver can hold

Deposits are refused when the amount, or the resulting principal, is above
`maxPrincipal = (2^64 - 1) / periodLength`. At a one-hour period that is about 5 billion
USDC. At a daily period it is about 213 million USDC.

**What it means:** the cap is real, and at a daily period on mainnet it is a number a
large institution could reach.

**Why it exists:** encrypted values here are 64-bit, and a saver's accumulated
balance-seconds must stay inside that. An encrypted overflow does not revert and nobody
sees it happen, so the cap is enforced at the door. The check bounds the incoming amount
as well as the resulting total, because otherwise a deposit large enough to wrap the sum
past `2^64` would produce a small number that passes the check.

**How the refusal behaves:** it is returned as an encrypted false and the token refunds
the deposit in the same transaction, so hitting the cap does not disclose your balance.

## 4. No reserve tier

PoolTogether V5 keeps a reserve share that tops up an over-subscribed tier. Hearth has no
reserve. The 50 percent utilisation rate is the only cushion.

**What it means:** when a tier hands out more prizes than it can fund, which happens in at
most roughly 2 percent of draws for the frequent tier, the savers the walk reaches last
get less or nothing rather than being topped up.

**Why:** a reserve needs an owner-controlled withdrawal path to be useful, and every owner
power in a confidential pool is something a saver has to trust.

## 5. Grand-tier odds are measured over one period

V5 measures the grand tier's odds over the tier's whole accrual window. Hearth measures
them over a single period, like every other tier.

**What it means:** a large holder who joins for one period takes a full proportional shot
at a pot that took 24 periods to build. Someone who saved through all 24 has no additional
claim on it.

**The known fix, deferred:** accumulate balance-seconds since the last grand payout and
weight the grand tier by that. It adds a second accumulator with its own overflow
analysis, so it is a version-two change rather than an unproven addition to version one.

## 6. Privacy needs three or more savers

The pool's exact total time-weighted balance is never published. What is published each
draw is the smallest power of two above it, because the draw needs some public scale to
run against.

**The leak this replaced:** publishing the exact total let anyone recover a lone mover's
deposit amount exactly. Two consecutive totals, the public timestamps of the deposit and
withdrawal events, and the arithmetic is a single division with no remainder. That was the
design until 3 September 2026 and a review broke it.

**What it means now:** with one saver, the published bracket is that saver's weight to
within a factor of two. With two, each can bound the other the same way. Below three
savers there is no meaningful anonymity set. Consecutive brackets can still be differenced,
but they are equal unless the pool crossed a power of two, so the differencing yields a
band rather than a number.

**What the app does:** it states this whenever the pool has fewer than three savers, rather
than showing a privacy claim that is not true at that size.

## 7. The token layer is Zama's, and its powers apply

Hearth's asset is Zama's confidential USDC wrapper, not ours.

**What it means:** its owner can appoint observers able to decrypt every amount that moves
through the token, and to do so **retroactively**, so amounts already on chain are exposed
to an observer appointed later. Watching for the appointment and exiting is not a defence.
The scope is deposit amounts, withdrawal payouts, the pool's own balance, and the one
prize-funding transfer per evaluation batch. The owner can also block an address, and the
contract is upgradeable. As of 2 September 2026 there were no observers and the pauser was
unset.

**What it does not reach:** Hearth's own ledger. Principal, winnings, per-draw weights and
per-draw credits live in the vault, and the token holds no access rights on them.

**One product consequence:** an evaluation batch that contained a single saver would make
that batch's funding transfer that saver's exact prize, under the observer assumption. The
keeper advances the walk in real batches for that reason as well as for gas.

**The alternative we rejected:** writing our own confidential token. That swaps a known,
audited, Zama-operated contract for one we grade ourselves.

## 8. Draws depend on somebody sending transactions

Nothing on chain fires by itself.

**What it means:** if no keeper runs and no saver acts, a draw is skipped and that period
pays no prize. A close that misses its deadline is refused outright rather than stranding
the draw, and an award that lands after the window still books the harvest, returns the
offered liquidity and marks the draw `Skipped`.

**What it does not mean:** money at risk. A skipped draw keeps its liquidity in the tiers,
the harvest is booked by a late award, and deposits and withdrawals are unaffected
throughout.

**What reduces it:** every step is permissionless, the app exposes them, and Chainlink
Automation covers the close step, which is the only step needing no off-chain data and the
only one with a deadline.

## 9. Yield on Sepolia is sponsored, not earned

The live pool's prize money comes from a sponsor-funded balance that drips at a set rate.

**What it means:** it is not real yield. Nobody is earning it from lending or from a
vault. When the sponsored balance runs out, prizes stop. A sponsorship cannot be taken
back once made, and only the source's owner can change the rate.

**Why:** there is no venue on Sepolia that pays yield on Zama's mock USDC. Aave refuses
those deposits, Compound wants Circle's own USDC, and Zama's Sepolia vault is idle-only
with no yield adapter, which is Zama's own description of it.

**What is real about it:** every unit of prize money was genuinely wrapped, genuinely
transferred to the pool as an encrypted transfer, and genuinely verified through a
KMS-signed decryption before being credited. A source that reverts no longer stops a draw
either: the harvest is booked as zero, `HarvestFailed` is emitted and the close succeeds.
The source of the money is a mock. The plumbing is not.

## 10. The wrap seam, and what a pinned balance costs

Turning public USDC into confidential USDC is a public transfer, so the amount is visible.

**What it means:** a saver who wraps and immediately deposits the same amount has published
their deposit. We measured this on our own earlier deployment: three of five live deposits
sat two to four blocks after a public wrap of exactly 100 USDC.

**What it costs, beyond the amount:** thresholds are public, because they are what makes
the draw checkable. So a balance an observer can pin has a public outcome in every draw
and every tier, computed with no decryption at all, and in every later draw too, since
winnings never enter the odds. Even a loose upper bound proves a definite loss in any tier
whose threshold sits above it.

**What Hearth does:** keeps wrap and deposit as separate steps, offers round wrap amounts
so a wrap is a bucket rather than an exact figure, warns at the deposit step, and lets a
saver hold a standing confidential balance so a deposit comes out of an accumulation of
unknown composition.

**What Hearth cannot do:** remove it. There is no confidential way to convert a public
token, and there is no way to make a threshold private without making the draw
uncheckable.

## 11. The walk order decides who is short in an over-subscribed tier

When a tier runs out mid-draw, the saver the walk reaches at that moment gets the
remainder and later ones get nothing from that tier.

**What it means:** in the rare over-subscribed draw, somebody is short-changed by a
position they did not choose.

**What it is not, any more:** a lever. An earlier version let the caller of `evaluate` hand
in a list of addresses, which put the order in the keeper's gift and let a saver buy the
front of the queue. Now the caller passes a count, the walk starts at a point derived from
the draw's seed, and the start moves every draw.

**What reduces it:** the affected saver can see it, because their weight and their credit
for the draw are both decryptable by them, so a short credit is provable rather than
mysterious.

## 12. The draw runs against a bracket, so a tier pays between half and all of its prizes

The winner test uses `M`, the smallest power of two above the pool's total weight, in
place of the total itself. `M` therefore sits between `W` and `2W`.

**What it means:** every saver's expected prize count is scaled by `W / M`, a number
between one half and one, so a tier pays between half and all of its nominal
`count * odds` prizes each draw. A pool that has just crossed a power of two pays at the
low end of that range until it grows into its bracket.

**What it does not mean:** lost money or distorted odds. Every saver in a tier is scaled
by the same factor, so nobody's share changes relative to anybody else's. What a tier does
not pay goes into its encrypted carry and is offered again, so prize sizes settle
somewhere between the nominal figures and twice them, and all of the yield still goes out.

**Why we took it:** the alternative was publishing the exact total, which is limitation 6.

## 13. Cumulative winnings become public if you round-trip through the wrapper

Wrapping in and unwrapping out are both public movements at the token layer, and the first
of the two unwrap calls is the one that publishes the amount, so an unwrap you never
finalize has already leaked it.

**What it means:** for an address whose only confidential USDC counterparty is Hearth, the
public unwrapped total minus the public wrapped total is a lower bound on lifetime
winnings withdrawn, and it becomes exact once that address has emptied out. Unwrapping to
a fresh address does not help, because the confidential transfer to that address is itself
the link.

**What reduces it:** unwrap in round denominations unrelated to your position, or leave a
standing confidential balance behind and never fully round-trip.

## 14. A balance that never changes is narrowed by the published prize counts

Every reconciliation publishes how many prizes a tier paid. Because every threshold is
public, that count is a constraint of the form "how many of these savers had a weight above
their own published threshold", and constraints accumulate.

**What it means:** a saver whose balance never changes across many draws is progressively
narrowed by those counts. A saver who deposits or withdraws resets their own unknown.

**What limits the rate:** nothing finer than a whole number of prizes is ever disclosed,
and the thresholds are not choosable by an attacker, because the seed is drawn inside the
coprocessor and revealed only after its period has closed.

**What we did about it:** each tier reconciles on its own cadence rather than every draw.
On Sepolia the grand tier reconciles every 24 draws and the mid tier every 6, so their
counts are published once a day and once every six hours instead of hourly. That cuts the
measurement rate on the two tiers whose counts would otherwise be most identifying, and it
means a jackpot is attributed to everyone eligible across a whole day rather than the
handful eligible in one draw. The cost is that money spends longer in the encrypted carry
before it counts toward a public prize size, though it can be won the whole time.

## Not a limitation, but worth stating plainly

- **A large saver wins often.** Odds are proportional to time-weighted balance, so someone
  holding a lot for a long time wins a lot. That is the design, not a flaw.
- **Prize sizes and prize counts are public.** They always were in PoolTogether. What is
  confidential here is who won, not how much the pool earned.
- **Hearth has not been audited by a third party.** It is self-audited with executed
  attacks and property tests, and the [threat model](security/threat-model.md) is the
  honest substitute rather than a replacement.
