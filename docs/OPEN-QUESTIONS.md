# Open questions

Things a judge or a careful reader would ask that `ARCHITECTURE.md` does not answer.
Written while drafting these pages, so that the docs state what is specified and flag what
is not, rather than guessing.

Each item says what is missing and where it bites in the documentation. Rewritten against
the 3 September revision, which answered eight of the previous thirteen.

## 1. How does the scale count map to the new bracket?

Section 4 says the vault "compares `W` under encryption against `2^(m-2) .. 2^(m+2)`
around the previous draw's `m` and against 1, sums the results into one small encrypted
count", and that the pool "derives the new `m` from the verified count (moving by at most
three steps per draw)".

Three things are unresolved in that sentence.

First, how many comparisons feed the count. Read literally, the comparison against 1 is
summed in with the five bracket comparisons, which would make six. But the non-empty flag
is a separate publicly decryptable handle in its own right, listed third in the award's
four-handle proof order, so it cannot also be folded into the count. Six comparisons
producing two published values is the reading that fits the rest of the specification; the
sentence reads as though one value comes out of all six.

Second, the exact mapping. Five thresholds distinguish six outcomes, so the count should
be able to name any bracket from `m-2` to `m+3`, which is a move of up to two down or
three up. "At most three steps" is stated but the direction is not, and the arithmetic
that turns the count into `m` is not written down.

Third, what happens when the true bracket is outside the window. If the pool grows by more
than three bits in one period, the tracker must saturate at the edge of its window and
catch up over later draws. That is the only behaviour consistent with "corrects it by up to
three bits per draw" in section 13, but it is not stated, and it decides whether a large
sudden deposit gets under-scaled odds for one draw or several.

**Where it bites:** `docs/security/randomness-and-verification.md` describes five
comparisons plus a separate comparison against 1, and says the bracket moves by at most
three steps, without giving the mapping. `docs/concepts/how-a-draw-works.md` says the same
thing in plainer words.

## 2. `MAX_BATCH` has no confirmed live value

`DECISIONS.md` records `MAX_BATCH` as 4, measured against the mock's price table with the
Sepolia tier set at 3,836,128 compute units per saver. `ARCHITECTURE.md` names the constant
but never gives a number, and the figure has already moved once with the tier set.

**Where it bites:** used as `{{MAX_BATCH}}` throughout the docs. The placeholder is kept
rather than filled from the mock, because a number quoted in the documentation should come
from the live coprocessor. It may land at 3 or 4.

## 3. Which draws are a tier "due" to reconcile on?

Section 2 says a tier reconciles every `reconcileEvery[t]` draws and that `finalizeDraw`
marks the carry decryptable "when a tier is due". It does not say what due means: `drawId`
divisible by the cadence, a per-tier counter of finalizations since the last reconcile, or
something the caller chooses.

The difference is visible. A divisibility rule means a tier's reconcile always lands on
the same draw numbers, which is predictable and easy to audit. A counter means a skipped
finalization shifts the whole schedule.

**Where it bites:** `docs/operations/keeper.md` tells the keeper to reconcile "each tier
that `finalizeDraw` published", which is true either way, and
`docs/concepts/prizes-and-tiers.md` describes the cadence without committing to how it is
counted.

## 4. What does the `drawId` in `reconcile(tier, carry, proof)` bind to?

The carry is a running total across the whole cadence span, so it is not a property of one
draw. The signature takes a draw id anyway, presumably the draw whose `finalizeDraw`
published the handle. It is not stated, and it matters for replay: the specification says
"each step succeeds once per draw and per tier", which is the right guard only if the id is
the publishing draw.

**Where it bites:** `docs/concepts/how-a-draw-works.md` step 5 and
`docs/security/randomness-and-verification.md` both describe the proof binding.

## 5. Does `DrawClosed` carry the plaintext part of `offered`, or the whole offer?

Section 6 defines `offered[t]` as the tier's plaintext liquidity plus its encrypted carry.
Section 13 gives the event as `DrawClosed(drawId, ..., prize[3], offered[3])` with
plaintext arrays. The encrypted half cannot be in a plaintext array, so `offered[3]` must
be the plaintext part only, which means the event under-reports what the tier can actually
pay.

**Where it bites:** `docs/security/what-stays-private.md` lists "each tier's prize size and
offered plaintext liquidity" as public, and
`docs/security/randomness-and-verification.md` does the same. Both hedge on the word
plaintext rather than asserting which number the event carries.

## 6. What happens to the evaluation walk when the saver list grows mid-window?

The cursor starts at `seed mod saverCount` and advances in list order until it wraps. New
savers can join during periods `p+1` and `p+2`, because deposits are never blocked by a
draw in progress, and the list is append-only.

Two things are undefined. Whether `saverCount` is snapshotted at the award or read live,
which decides whether the modulus and the wrap point can move under the walk. And whether a
saver who joins after the award is walked over at all: they have no observation at or
before period `p`, so they cost nothing, but they do shift the wrap point.

**Where it bites:** `docs/operations/keeper.md` tells the keeper to advance "until the walk
wraps", and `docs/concepts/how-a-draw-works.md` describes the cursor.

## 7. Is `awardDraw` callable after the window, or not?

Section 2 introduces `awardDraw` as happening "inside the window", then in the same
paragraph specifies what happens "if the window has already closed": the harvest is booked,
the liquidity is returned and the draw is marked `Skipped`. The second sentence requires
the call to be legal outside the window that the first sentence restricts it to.

The intent is clear enough, but "inside the window" is the wrong qualifier on the
signature line if a late award is a supported path with its own behaviour.

**Where it bites:** `docs/concepts/how-a-draw-works.md` step 2 and the missed-step table in
`docs/operations/keeper.md` both treat a late award as legal and describe the `Skipped`
outcome. If it is in fact rejected after the window, both are wrong and a stranded draw's
harvest is lost.

## 8. Is the unfunded counter ever reset?

Section 5 describes "one global encrypted unfunded counter, whose current handle is
published at every finalization", and section 13 gives `DrawFinalized(drawId, unfunded)`.
Nothing describes clearing it. A global counter that only ever grows is the right shape for
a solvency proof, but if a shortfall ever did occur, every later finalization would keep
publishing it with no way to distinguish a new shortfall from the old one.

**Where it bites:** described as a global counter in
`docs/concepts/how-a-draw-works.md` and `docs/security/randomness-and-verification.md`,
which say it is always zero under honest operation and stop there.

## 9. Is there a way to move winnings into principal without leaving the vault?

`ARCHITECTURE.md` now states plainly that winnings never count toward odds and that weight
is principal only. It still describes no path to reinvest. A saver has to withdraw and
deposit again, which is two transactions and two token transfers, and the withdrawal is
also the exact behavioural residual the design warns about.

**Where it bites:** `docs/faq.md` question 6 tells savers to withdraw and deposit back. A
one-transaction reinvest would be both cheaper and quieter, and it is not specified.

## 10. `DECISIONS.md` keeps superseded lines without marking them

Entries dated 2 September 2026 were replaced by entries dated 3 September: the folded
single-threshold winner test, two observations per saver, the one-period evaluation window,
publishing the aggregate, prize sizes fixed at award, evaluation by address list, and the
shortfall re-credit on withdrawal. `ARCHITECTURE.md` section 14 explains the changes, but a
judge reading `DECISIONS.md` top to bottom will hit the old lines first and may quote them
back.

**Suggestion:** mark each superseded line, in place, with the date and the entry that
replaced it.

## Answered by the 3 September revision

Kept as a record so that a reader who saw the earlier list knows these were closed rather
than dropped.

| Was | Now |
| --- | --- |
| The over-subscription figure for the count-1 tiers looked wrong | Section 4 states about 2 percent for the frequent tier and a negligible fraction for mid and grand. |
| Can an address join the saver list without depositing anything? | Yes. Section 5 says the hook cannot see the amount, so any address that triggers it joins, even with an encrypted zero. |
| Is a saver ever removed from the list? | No. Section 5 says the list is never pruned. |
| Is the unfunded counter global or per draw? | Global. Section 5 says so, and the event lost its per-tier array. See question 8 for what is still missing. |
| How does the Confidential Vault adapter provide a synchronous `harvest()`? | Section 7 moves the redemption ahead of the harvest: the keeper walks a redemption through the batcher's four stages so the proceeds are already in the adapter when `harvest` is called. |
| What can the sponsor do after sponsoring? | Section 7 says a sponsorship cannot be withdrawn and only the owner can change the rate. |
| The constructor signatures are not written down | Section 13 gives all three, with the `Tier` struct. |
| What does `evaluate` do for an `Empty` or `Skipped` draw? | Section 4 says it reverts, and also for a draw not yet awarded. |
| Do winnings count toward odds? | Section 3 says no: weight is principal only. The reinvest half is still open as question 9. |
| The pause scope is only in `DECISIONS.md` | Section 5 states it: pause stops deposits and closing, never withdrawals, evaluation, award, finalize or reconcile. |
| Does withdrawing only winnings touch the time-weighted record? | Section 3 says every exit records an observation regardless, and that it is harmless because slots shift only on a period change. |
