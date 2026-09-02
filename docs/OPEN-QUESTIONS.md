# Open questions

Things a judge or a careful reader would ask that `ARCHITECTURE.md` does not answer.
Written while drafting these pages, so that the docs state what is specified and flag
what is not, rather than guessing.

Each item says what is missing and where it bites in the documentation.

## 1. The over-subscription figure for the count-1 tiers looks wrong

`ARCHITECTURE.md` section 4 says:

> "The probability of the clamp biting is about one to two percent per draw for the
> frequent tier with count 4 and a few percent with count 1"

The frequent-tier figure checks out. That tier expects 4 prizes and can fund 8, and for a
pool of many small savers the count is close to Poisson with mean 4, giving about a 2
percent chance of needing a ninth.

The count-1 figure does not. The mid tier expects `count * odds = 1/6` prizes and can fund
2, so the clamp needs three or more winners, which is roughly 0.07 percent. The grand tier
expects 1/48 and needs three winners, which is around one in a million. Neither is "a few
percent".

**Where it bites:** `docs/concepts/prizes-and-tiers.md` states the frequent-tier figure as
derived and says the count-1 tiers clamp far more rarely, rather than repeating the
sentence above. If the specification meant something different by that phrase, the page
needs correcting.

## 2. `MAX_BATCH` has no value yet

Section 2 says "at most `MAX_BATCH` savers per call" and section 9 says the keeper
evaluates "in batches of `MAX_BATCH`", but the number is never given. `PLAN.md` milestone
1 lists measuring it as work still to do.

**Where it bites:** used as `{{MAX_BATCH}}` in eight places across the docs.

## 3. Can an address join the saver list without depositing anything?

The deposit hook cannot branch on an encrypted amount, so a transfer of an encrypted zero
plausibly still runs the hook and registers the caller as a saver. Our previous design had
exactly this: a wallet that never held the token could register itself, and an operator
could register other wallets with one reused encrypted zero.

Section 2 says unknown addresses are "skipped without reverting" during evaluation, and
`DECISIONS.md` says fake savers "cost the keeper gas only", which reads as though the
answer is yes.

**Where it bites:** `docs/security/threat-model.md` attacker 3 states that fake savers cost
the keeper gas and change nobody's odds. If registration is in fact gated, that section
understates the defence.

## 4. Is a saver ever removed from the list?

Views include `saverCount()`, `saverAt(i)` and `isSaver(a)`, but nothing describes removal
after a full withdrawal. If the list is append-only, the keeper's evaluation cost grows
monotonically with everyone who ever deposited, not with the current saver count.

**Where it bites:** the budget section of `docs/operations/keeper.md`.

## 5. Is the unfunded counter global or per draw?

Section 13 lists the event `DrawFinalized(drawId, remaining[3], unfunded)`, which reads as
per draw, and the view `unfundedHandle()` with no argument, which reads as global.

**Where it bites:** described as "an encrypted unfunded counter" in
`docs/concepts/how-a-draw-works.md` and `docs/security/randomness-and-verification.md`,
without committing either way.

## 6. How does the Confidential Vault adapter provide a synchronous `harvest()`?

`IYieldSource.harvest()` returns the encrypted amount transferred in the same call.
Zama's batcher does not work that way: a redemption joins a batch, waits for the batch to
reach its minimum age, waits for the aggregate to be decrypted and the vault to settle,
and only then is claimable. Zama's own batch-lifecycle documentation describes the four
stages as join, dispatch, finalize, claim.

Section 7 says the adapter "redeems growth through the redeem batcher" but does not say
how that maps onto a single synchronous call.

**Where it bites:** `docs/concepts/yield-source.md` names this as the main piece of work
in taking the adapter live, rather than describing a mechanism that may not be the one
intended.

## 7. What can the sponsor do after sponsoring?

Section 7 describes `sponsor`, `ratePerSecond` and `harvest`, and section 13 lists a
`RateChanged(rate)` event, but not who may change the rate, nor whether a sponsor can
withdraw an unspent balance.

**Where it bites:** `docs/security/threat-model.md` attacker 6 says a sponsor can stop
sponsoring, and explicitly logs the withdrawal question rather than asserting an answer.

## 8. The constructor signatures are not written down

Section 6's repo layout and section 13's views are specified, but no constructor argument
list is. In particular: does `HearthPrizePool` take the vault address in its constructor,
with `vault.setPrizePool` closing the loop afterwards? That is what the event list
implies, since `PrizePoolSet` is a vault event and there is no matching pool event.

**Where it bites:** `docs/operations/deploying.md` gives the deploy order and a table of
what each parameter means, and states that it is not a claim about argument order.

## 9. What does `evaluate` do for an `Empty` or `Skipped` draw?

Section 2 defines both states but does not say whether `evaluate(p, savers)` reverts,
no-ops, or marks savers evaluated with a zero credit for such a draw. The difference
matters for the app, which has to decide whether to show an evaluate button.

## 10. Do winnings count toward odds, and is there a reinvest path?

`DECISIONS.md` says prizes go to "a separate encrypted winnings balance that does not
count toward odds". `ARCHITECTURE.md` never restates it: section 3 tracks a `balance` and
section 5 talks about principal, but the exclusion is not written down there.

There is also no described way to move winnings into principal in one step. A saver has to
withdraw and deposit again, which is two transactions and two token transfers.

**Where it bites:** answered in `docs/faq.md` question 6 on the strength of
`DECISIONS.md`. If the vault does something different, that answer is wrong.

## 11. The pause scope is only in `DECISIONS.md`

`DECISIONS.md` says pause stops "deposits and draw closing only, never withdrawals or
evaluation". `ARCHITECTURE.md` lists `paused()` views and OpenZeppelin's `Pausable` in the
dependency graph, but never states what pausing actually stops.

**Where it bites:** `docs/security/threat-model.md` attacker 5 states the scope, sourced
from `DECISIONS.md`. It is load-bearing for the claim that withdrawals are always
available, so it should be in the specification and enforced by a test.

## 12. Does withdrawing only winnings touch the time-weighted record?

`withdraw` pays from winnings first and principal second. If a saver withdraws an amount
covered entirely by winnings, their principal has not changed, so intuitively no
observation should be pushed. Section 3 describes observation updates "on a balance
change" without saying which balance.

**Where it bites:** if a winnings-only withdrawal pushed an observation, it would consume
one of the three slots and could interact with the two-period window argument.

## 13. `DECISIONS.md` keeps superseded lines without marking them

Three entries dated 2 September 2026 were replaced by entries dated 3 September: the
folded single-threshold winner test, two observations per saver, and the one-period
evaluation window. `ARCHITECTURE.md` section 14 explains the changes, but a judge reading
`DECISIONS.md` top to bottom will hit the old lines first and may quote them back.

**Suggestion:** mark each superseded line, in place, with the date and the entry that
replaced it.
