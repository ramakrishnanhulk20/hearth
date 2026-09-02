# Threat model

Nine attackers, what each of them wants, what stops them, and what does not. The last
column is the one worth reading. A threat model that only lists defences is marketing.

Hearth's core contracts are immutable once deployed. There is no proxy and no upgrade
path, so nothing on this page can be changed after the fact except by deploying a new
pool.

## 1. A curious observer

Someone with an archive node, a block explorer and time. No capital, no privileged
access.

**Wants:** to know who saved how much, whose odds are best, and who won each draw.

**Stopped by:** every per-person value is a ciphertext. Principal, winnings, per-draw
weight and per-draw credit are readable only by the saver who owns them, enforced by
Zama's access control list, which makes the relayer refuse a decryption request from any
other address. There is no claim transaction to watch for, and evaluation cannot be aimed
at yourself, so no transaction exists that only a winner would send. Winners and losers
receive identical writes in the same batch, because the payout is an encrypted select
rather than a branch, so the transaction shapes and gas costs match.

**One leak this design removed.** An earlier draft published the pool's exact total
time-weighted balance every draw. With that number public for two consecutive periods, and
the public timestamp of a saver's own transaction, a saver who was the only one to move
money in a period had that amount recovered exactly, not bounded. The vault now publishes
only the power-of-two bracket above the total, tracked by five encrypted comparisons per
draw, and the equation has nothing left to solve. The full statement is rule 1 of
[what stays private](what-stays-private.md).

**Not stopped by anything:**

- The saver list, and the block each saver deposited, withdrew or was evaluated in.
- The bracket the pool's total fell in, which with fewer than three savers pins a saver's
  weight to within a factor of two. See the anonymity-set rule in
  [what stays private](what-stays-private.md).
- **A balance the observer can pin has a public outcome in every draw.** Thresholds are
  public by design, and the winner test is a deterministic function of one secret and
  otherwise public data. Wrap 1,000 USDC and deposit 1,000 USDC seconds later and your
  every win and loss, in every tier, in every draw from then on, is public arithmetic.
- **Cumulative winnings are a public lower bound** for an address that wraps in and
  unwraps out in full, because both movements are public at the token layer.
- **A static balance is narrowed slowly.** The published prize counts are a small
  measurement of the balance distribution and they accumulate against a saver whose
  balance never changes. Every tier publishes its count one draw later, so the measurement
  runs once per tier per draw. The cadence that would slow it down is a constructor dial
  this deployment set to one, because the same step is what returns unwon money to the
  public pot and keeps the jackpot visible. Limitation 14.
- The behavioural residual: withdrawing only after draws you won, over many draws.

## 2. A whale

Someone with a lot of capital who wants odds cheaply.

**Wants:** to capture prizes without leaving money in the pool, or to farm the mechanics.

**Stopped by:**

- **Time weighting.** Odds come from the average balance across the whole period. A
  deposit made with 6 minutes left in a one-hour period earns one tenth of the odds of the
  same amount held all period. This is the defence our previous design lacked, and the
  attack it allows was executed: an attacker cycling 9,000 USDC around each draw won 19 of
  20 draws and emptied a 5,000 USDC reserve.
- **Linearity.** Expected prizes are exactly proportional to weight, and the bracket the
  draw runs against does not depend on how the pool's weight is split between addresses.
  Splitting one wallet into six gains nothing, and consolidating six into one gains
  nothing.
- **The per-saver cap.** Deposits are refused when the amount, or the resulting principal,
  is above `(2^64 - 1) / L`, and the refusal is encrypted so it discloses nothing. Bounding
  the amount as well as the total is what stops the encrypted addition in the check from
  wrapping.

**Not stopped:**

- A whale who genuinely holds a large balance for the whole period wins often. That is the
  product, not an attack: their money earned the yield that paid the prizes.
- The grand tier's odds are measured over one period, so a whale who joins for a single
  period takes a full proportional shot at a pot that took 24 periods to build. That is a
  stated deviation from PoolTogether V5 and is limitation 5.

## 3. A griefer registering fake savers

Someone who adds many worthless addresses to the saver list.

**Wants:** to stall draws, dilute odds, or make the pool expensive to run.

Registration is open by construction. The deposit hook cannot see the encrypted amount it
was handed, so any address that triggers it joins the saver list, even with an encrypted
zero, and the list is never pruned.

**Stopped by:**

- **Odds are untouched.** A saver with no balance has zero weight. Weight zero cannot beat
  any threshold, and it contributes nothing to the total, so the odds of every real saver
  are exactly what they would be without the fakes. Our previous design needed a
  registration bond for this. This one does not.
- **Evaluation cannot be jammed.** A saver already evaluated for a draw, an address that
  is not a saver, and a saver whose first observation is after the period all get skipped
  without reverting, and the skip is decided from plaintext timestamps at no encrypted
  cost. One bad entry cannot fail a batch.
- **Batches are capped** at `{{MAX_BATCH}}` savers needing encrypted work per call, so no
  single transaction can be pushed past Zama's compute limit.

**Not stopped:** the keeper's cost per draw grows with the saver list, which is
append-only. A griefer cannot change anybody's odds, but they can make evaluating everybody
expensive. The keeper's answer is a spend cap of its own: it advances the walk until its
per-draw budget is used. Nothing on chain caps evaluation, so the honest consequence is
that in a heavily griefed pool the walk may not reach every real saver inside the window.
Two things soften it. The walk starts at a different point every draw, derived from that
draw's seed, so nobody is systematically last. And anyone can advance the walk further
from the app, which costs gas and reveals nothing about who is asking. See
[the keeper page](../operations/keeper.md).

## 4. A lazy or hostile keeper

The address that normally pushes draws along. Ours, or somebody else's.

**Wants:** to skip a draw it did not win, to choose the order in which savers are paid, or
simply to stop working.

**Stopped by:**

- **Every step is permissionless.** Close, award, evaluate, finalize and reconcile can be
  called by anyone, including any saver from the app. A keeper that refuses to award a
  draw cannot make it disappear; somebody else awards it.
- **The keeper cannot choose who is evaluated.** `evaluate(drawId, count)` takes a count,
  not a list. The walk order is fixed by the draw's seed, so the keeper cannot put itself
  or a friend first in an over-subscribed tier, and cannot leave a specific saver out.
- **A late close is refused, not tolerated.** Closing must land before
  `closeDeadline(p)`, the middle of the window's second period. A close in the last block
  of the window would have left no room for the decryption round trip and would have
  stranded the draw permanently. Now that transaction simply reverts and the draw is
  skipped cleanly.
- **A skipped draw costs nothing.** Liquidity that was never offered stays in its tier and
  is offered again. A late award still books the harvest, still returns the offered
  liquidity to the tiers, and marks the draw `Skipped`. That period pays no prize, and no
  money is lost or stranded.
- **The keeper cannot change an outcome.** Winner selection is fixed the moment the seed
  and the bracket are verified. Evaluation writes down an existing result.

**Not stopped:**

- Once the seed and the bracket are public, whoever is about to call `awardDraw` can
  compute their own result first and decide whether to bother. Awarding is permissionless
  and the app offers it to anyone, so this is a nuisance rather than censorship, but it is
  real and it is stated.
- If nobody at all acts inside the two-period window, that draw pays nothing.

## 5. The pool owner

Us. The address that deployed the contracts.

**Wants:** enumerated here so a saver does not have to guess.

**Powers, in full:**

| Power | Bound |
| --- | --- |
| Pause | Stops deposits and draw closing. Never stops withdrawals, evaluation, award, finalize or reconcile. |
| Set the yield source | Emits `YieldSourceSet`. Cannot affect any existing balance. |
| Rescue foreign tokens | Cannot touch saver principal or winnings. |
| Transfer ownership | Two-step. Renouncing is disabled, so ownership cannot be dropped into the void. |

**Cannot:** read any saver's principal, winnings, weight or credit, because the contracts
never grant the owner access to them. Cannot change a draw's outcome. Cannot move anyone's
money. Cannot upgrade the contracts, because there is no upgrade path.

**Not stopped:** a hostile owner can pause deposits indefinitely, and can point the pool
at a yield source that pays nothing. That starves the prize side of the product. It no
longer stops the clock: a source that reverts is caught, the harvest for that draw is
booked as zero, `HarvestFailed` is emitted and the close succeeds anyway. Neither power
takes a single unit of anybody's principal, and withdrawals keep working throughout.

## 6. The sponsor

Whoever funds the Sepolia yield source.

**Wants:** in the honest case, to give the demo prize money. In the adversarial case, to
time or withhold prizes.

**Stopped by:** the sponsor has no influence on who wins. They fund a balance; the seed,
the weights and the thresholds are nothing to do with them. Sponsor amounts, the drip rate
and every harvest are public, so anybody can see exactly how much prize money exists and
how fast it is arriving. A sponsorship is a donation: it cannot be withdrawn once made,
and only the source's owner can change the drip rate.

**Not stopped:** a sponsor who stops sponsoring ends the prizes once the balance drips
out. Prizes are yield, and no yield means no prizes. Principal is untouched throughout,
which is the whole point of a no-loss design.

## 7. The token operator

Zama, as owner of the confidential USDC wrapper. Hearth's asset is their contract, not
ours.

**Wants:** enumerated, not alleged.

**Powers, read from the verified Sepolia source on 2 September 2026:**

- `addObserver(address)` grants an address wildcard decryption over every handle the token
  holds rights on, **retroactively**. An observer appointed at any future date can decrypt
  amounts already on chain, so monitoring for the appointment and exiting is not a
  defence. The scope is every deposit amount, every withdrawal payout, the pool's own
  token balance, and the one prize-funding transfer per evaluation batch. There is no
  per-winner payout to read, because Hearth has no per-saver prize transfer; a batch that
  contained a single saver would, however, make that batch's total that saver's exact
  prize. Live state that day: `observerCount()` was 0 and `observers()` was empty.
- A deny list. A blocked address cannot deposit, withdraw or unwrap, because each is a
  token transfer with that address on one side.
- A pauser role, live set to the zero address, so pausing is currently disabled.
- The implementation is upgradeable by its owner behind a proxy.

**Stopped by:** nothing we control. This is a trust assumption, not a defence.

**What it does not reach:** Hearth's own ledger. Principal, winnings, weights and credits
live in the vault, and the token holds no access rights on them, even under a hostile
token upgrade. We verified this on the previous deployment: the token address returns
false for permission on a depositor's principal and winnings handles, while the depositor
and the pool return true.

## 8. Zama's KMS quorum

The parties holding the network's decryption key.

**Wants:** enumerated because this is the deepest assumption in any FHEVM application.

**What they could do:** the contract verifies that a cleartext carries a valid signature
from the quorum. It cannot verify that the cleartext is the true plaintext of the handle.
A dishonest quorum could therefore sign a seed value of its choosing, and the contract
would accept it, which would let it choose winners.

**Stopped by:** nothing in Hearth. Every application on this protocol inherits it, and
Zama's own documentation states the boundary plainly: the protocol is trusted to compute
correctly on ciphertexts and to decrypt only what is marked publicly decryptable.

**Worth knowing:** the quorum still cannot read anything that is not marked publicly
decryptable, and in Hearth that is only the seed, the scale count, the non-empty flag, the
harvest, each tier's carry when it is due, and the unfunded counter. No individual saver's
value is ever in that set, and neither is the pool's exact total weight.

## 9. The relayer

The service that routes decryption requests between browsers and the protocol.

**Wants:** enumerated.

**Can:** refuse or delay service, which delays a draw. It also sees which address asked to
decrypt which handle, so it learns that you checked your own numbers, though not what they
say.

**Cannot:** decrypt anything itself, since it does not hold the key. Cannot forge a KMS
signature, which is what the on-chain verification is for. Cannot grant itself access to a
handle, since that is the access control list's job and it lives on chain.

**Stopped by:** the two-period window absorbs a slow relayer, and the close deadline
guarantees at least half a period of it is still ahead when the round trip starts. Beyond
that the draw is skipped, the harvest is still booked and the liquidity is still there. A
relayer outage costs a draw, never money.

## What the old design got wrong, and how this one closes it

Before this rebuild, Hearth was a single contract called `LanternPool` that weighted savers
by their balance at the instant of the draw and scanned depositors in chunks. We audited it
against ourselves on 2 September 2026 and executed the attacks rather than reasoning about
them. Six of the eight findings below were reproduced in running code.

| # | What went wrong | Evidence | How this design closes it |
| --- | --- | --- | --- |
| 1 | **Flash deposit.** No time weighting, so a deposit made one block before the draw counted in full. | Executed on the mock: 20 cycles, attacker won 19 of 20 and drained a 5,000 USDC reserve. The whole cycle also fit in one transaction, 2,189,992 gas. | Odds come from the time-weighted average over the whole period. A last-minute deposit earns its fraction of the period and nothing more. |
| 2 | **The claim transaction was a winner tell.** Winner and loser claims were identical, but only a winner had a reason to send one. | Executed: winner and loser claim cost 391,944 gas each on the mock with identical logs. On Sepolia a claim landed 48 seconds after a settlement. | There is no claim function. Prizes land in an encrypted winnings balance during evaluation, `withdraw` is the only exit, and evaluation cannot be aimed at yourself. |
| 3 | **A public bit every draw.** A house ticket's winnings handle was re-published as publicly decryptable in every draw, leaking whether the house won, which with one real saver named the winner. | Executed on the mock over 16 draws, and confirmed on Sepolia across three settled draws. | There is no house ticket. The only publicly decryptable values are the seed, the scale count, the non-empty flag, the harvest, the tier carries and the unfunded counter. None is per-saver. |
| 4 | **Not publicly verifiable.** The pool's total was never published, so an outsider could not check the draw at all. | Read from the deployed source and confirmed live. | The seed and the bracket are published with a KMS proof verified on chain, and every threshold is recomputable by anyone from those two numbers. |
| 5 | **Yield booked from a report.** Reserve top-ups were booked from the amount passed in, while the wrapper mints `amount / rate()`. Latent on Sepolia only because the rate happened to be 1. | Executed against an 18-decimal test token, where the rate is a million million. | The pool books only the KMS-verified amount the source actually transferred. |
| 6 | **Free registration griefing.** A wallet that never held the token could register itself, and an operator could register other wallets with one reused encrypted zero. | Executed. | Registration is still open, by construction. Fake savers carry zero weight, change nobody's odds and are skipped in plaintext. The only cost is keeper gas, which the keeper bounds itself. |
| 7 | **The wrap seam, unmitigated.** The app wrapped and deposited in one flow. | Measured live: three of five deposits sat two to four blocks after a public 100 USDC wrap. | Wrap and deposit are separate steps and the app explains why. The seam is reduced, not removed, and is limitation 10. |
| 8 | **No keeper.** Draws were permissionless but nobody ran them: the live pool sat 26 hours with an openable draw. | Read live from the chain. | A keeper script runs every step, Chainlink Automation covers the close step as redundancy, and any saver can advance a draw from the app. |

Two further design changes came out of the 3 September review and are not in that table,
because the old design did not get far enough to have them: publishing the exact aggregate
was replaced by the bracket (attacker 1 above), and prize sizes were moved from the award
to the close so that no prize can be resized after its seed exists.

## What is checked, and how

Every claim above has a test. The executed outputs land under `{{ATTACK_LOG_DIR}}` and the
numbers are pasted into the README.

| Claim | The check |
| --- | --- |
| A stranger cannot read a saver's values | Ask the relayer to decrypt another address's principal, winnings, weight and credit. Expect refusal on all four. |
| The pool's exact total is not obtainable | Ask the relayer for the aggregate weight handle. Expect refusal. Then difference the published brackets of consecutive draws in a pool where one saver moved, and show the answer is a factor-of-two band, not a number. |
| A flash deposit earns almost nothing | Deposit near the end of a period, evaluate, and compare the stored weight against a full-period holder. |
| Fake savers cannot stall a draw | Register many empty addresses, then run a full draw. |
| Nobody can choose who is evaluated | Call `evaluate` from a saver's own address and show the walk advances from the seed-derived cursor, not from that saver. |
| A late close is refused | Call `closeDraw` after `closeDeadline` and expect a revert; then confirm the draw is skippable and its liquidity untouched. |
| A missed award loses nothing | Let the window pass, award late, and check the harvest is booked, the offered liquidity is back in the tiers and the draw reads `Skipped`. |
| A reverting yield source does not stop the clock | Attach a source that reverts, close a draw, and expect success plus `HarvestFailed`. |
| An over-subscribed tier clamps rather than overpaying | Force more winners than the tier can fund and check that paid never exceeds offered. |
| A proof cannot be replayed | Resubmit an award proof against a different draw. Expect a revert. |
| Nobody withdraws more than they own | Property test: for every account, withdrawals never exceed principal plus winnings. |
| Money is conserved | Property test: vault token balance equals total principal plus total unclaimed winnings, and pool token balance equals plaintext liquidity plus every encrypted carry plus liquidity offered and not yet finalized plus harvests received at close and not yet booked by an award. That last term is the harvest between the close that receives it and the award that splits it across the tiers, when it belongs to no tier and no draw. |

## What this threat model does not cover

- Anything outside the chain: your device, your wallet's key handling, the RPC endpoint
  you use, and network-level metadata.
- Economic attacks on the yield venue itself. On mainnet, vault risk is inherited in full
  from the ERC-4626 vault behind Zama's batcher.
- Formal verification. Hearth is self-audited with executed attacks and property tests. It
  has not been audited by a third party, and this page is the honest substitute, not a
  replacement.
