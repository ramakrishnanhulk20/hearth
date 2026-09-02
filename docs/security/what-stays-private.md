# What stays private

The judging criteria ask three things about confidentiality: what stays encrypted, is the
draw provably fair and deposit-weighted, and is any leakage minimal and documented. This
page is the answer to the first and third. Our position is that naming every seam
ourselves is worth more than a claim nobody can check.

## The table

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

Two ways to read that table. The left column of secrets is exactly the per-person
information, plus the two pool-wide totals that turned out to be per-person information in
disguise. The right column of public facts is what an outsider needs to check that the
draw was honest. That split is the design.

## What an observer can and cannot work out

An observer with a full archive node and unlimited patience can build:

- The complete list of savers and the exact block each one acted in.
- Every draw's seed, bracket, harvest and prize sizes, and each tier's prize count, one
  draw after the draw it belongs to.
- Every threshold every address had to beat. They can literally compute your ladder.
- The pool's total holdings in confidential USDC as an encrypted handle, which they cannot
  read.

They cannot get:

- Any individual balance, at any time.
- Any individual weight, so no individual's odds.
- Which addresses won any draw, or how much anyone was paid.
- The pool's exact total weight, only the power of two above it.

The gap between those two lists is what Hearth sells. The rest of this page is the honest
account of where that gap narrows.

## Rule 1: the bracket, and the leak we removed

Until 3 September 2026 this design published the pool's exact total time-weighted balance
`W` at every draw, on the argument that publishing it was what made the draw verifiable. A
review proved that argument too expensive.

Here is the leak, in the reviewer's terms. For any closed period `p`,
`W_p = B * L + sum over each action of D_i * (periodEnd(p) - t_i)`, where `B` is the total
principal carried into the period and `D_i` is the signed change made by each action. `B`,
`L`, `periodEnd(p)` and every `t_i` are public, because the deposit and withdrawal events
carry the timestamps. So **a saver who is the only one to move money in a period has that
amount recoverable from the two published totals and the public timestamp of their own
transaction.** Not bounded, recovered exactly, remainder zero. It gets worse with more
data, not better: every closed period is one more equation, every action is one unknown,
the chain is anchored at zero, and the events name who acted and when, so two movers
between two quiet periods are also recovered exactly.

That leak is gone, because the number it needs is no longer published. What the vault
publishes now is the bracket: the smallest power of two at or above `W`, written `M`. Five
encrypted comparisons per draw track where `W` sits relative to the previous draw's
bracket, and only the small count they add up to is decrypted. Between crossings of a
power of two, consecutive draws publish the same number, and differencing them gives zero.

What remains is a much smaller version of the same thing.

- **One saver.** The published bracket is that saver's weight to within a factor of two.
- **Two savers.** Each can subtract their own weight and bound the other's, again to
  within a factor of two.
- **Three or more.** Any split consistent with the bracket is possible, and the set grows
  with every additional saver.

The app states this whenever the pool has fewer than three savers. Zama's own
documentation makes the same point about their batcher, in the same words: "the sum of one
value is the value." A bracket is a weaker version of that sentence, not an escape from
it.

## Rule 2: a balance an observer can pin has no draw privacy at all

This is the sharpest single statement on the page, so it gets its own rule.

The winner test is a deterministic function of one secret, your weight, and otherwise
entirely public data. Thresholds are public by design, because they are what makes the
draw checkable. So **anyone who can pin your balance computes your won or lost result for
every tier of every draw, with no decryption at all**, and for every later draw too, since
winnings sit in a separate balance that never enters the odds.

The usual way a balance gets pinned is the wrap seam in rule 3: wrapping public USDC into
confidential USDC is a public movement, so a saver who wraps and then deposits the same
amount seconds later has published their deposit. From that point their draw outcomes are
public arithmetic.

Even a loose bound bites. An observer holding only an upper bound on your balance proves a
definite loss in any tier whose threshold sits above that bound.

What the app does about it: keeps wrap and deposit as separate steps, offers round wrap
amounts so a wrap is a bucket rather than an exact deposit, encourages holding a standing
confidential balance so a deposit is drawn from an accumulation of unknown composition,
and warns at the deposit step in one line. What no contract change can do is make a
threshold private, because a private threshold is an uncheckable draw.

## Rule 3: the wrap seam, both directions

Turning public USDC into confidential USDC is a public ERC-20 movement. The amount appears
in the wrapper's `Wrap` event, in the underlying token's `Transfer`, and again in the
coprocessor's record of encrypting that plaintext. There is no confidential way to convert
a public token.

We measured the correlation on our own earlier deployment. Scanning Sepolia blocks
11528000 to 11618500, three of five deposits sat two to four blocks after a public wrap of
exactly 100 USDC by the same address. Anyone reading public logs could price those three
deposits at 100 USDC without breaking a single cryptographic guarantee. Zama documents the
same effect for their batcher and calls it shield-join correlation.

Unwrapping publishes an amount too, and the first of the two unwrap calls is the one that
does it, so an unwrap that is never finalized still leaks. That gives a second named
disclosure: **cumulative winnings become a public lower bound for any address that wraps
in and unwraps out in full.** For an address whose only confidential USDC counterparty is
Hearth, the public unwrapped total minus the public wrapped total is exactly lifetime
winnings withdrawn, less whatever principal and confidential balance that address still
holds. Both of those are hidden and non-negative, so the difference is always a lower
bound, and it becomes exact once the address has emptied out.

Unwrapping to a fresh address does not help, because the confidential transfer to that
address is itself the link.

What Hearth does: separate steps, a warning at the wrap step, round denominations offered
at both wrap and unwrap, and the suggestion to leave a standing confidential balance
behind. What Hearth cannot do: remove any of it.

## Rule 4: the published prize counts are a slow measurement

Every reconciliation publishes how many prizes a tier paid. Because every saver's
threshold is public, that count is a hard constraint of the form "how many of these savers
had a weight above their own published threshold". It carries only a few bits, but it is a
real measurement, and it accumulates.

**A balance that never changes across many draws is progressively narrowed by those
counts.** A saver who deposits or withdraws resets their own unknown and starts the
narrowing over.

Two things limit the rate. The counts are coarse: nothing finer than a whole number of
prizes is ever disclosed. And the thresholds are not choosable by an attacker, because the
seed is drawn inside the coprocessor and revealed only after its period has closed, so
nobody can aim a query at a suspected balance.

A third damper was available, and this deployment gave it up on purpose.
`reconcileEvery[t]` sets how many draws pass between publications of a tier's carry.
Raising it publishes one count per span instead of one per draw, so a jackpot is
attributed to everyone eligible across that span. What it costs is the jackpot itself: a
close moves all of a tier's public liquidity into the draw, and that money comes back only
at a reconcile, so at a cadence of 24 the grand tier's public liquidity is one draw's
harvest share on 23 draws out of 24, the published prize is sized off that, and the
accumulated pot appears in the open only on the reconcile draw. The money is offered and
winnable the whole time inside the encrypted carry. Nobody can see it.

So all three tiers run at `reconcileEvery = 1`. The pot accumulates in public, each tier's
count becomes public one draw later, and the measurement above runs at its full rate of
one count per tier per draw. On the grand tier that means a payout points at the savers
eligible in that one draw, roughly four percent of the pool, rather than at a day of them.
This is a disclosed residual, not a mitigated one, and it is limitation 14. The cadence is
still a constructor argument, so a deployment that wants the slower measurement more than
the visible pot can have it.

## Rule 5: the token layer is Zama's, not ours

Hearth's asset is Zama's confidential USDC. That is deliberate, and it means the token's
own powers apply to money moving through Hearth. Naming them:

The Sepolia contract is a `ConfidentialWrapper` behind an upgradeable proxy, owned by
Zama, with two-step ownership and renouncing disabled. Reading its verified source on 2
September 2026 gives three facts that matter for privacy:

1. **Observers, retroactively.** The owner can call `addObserver(address)`, which grants
   that address wildcard user-decryption over every handle the token contract holds rights
   on. That covers every deposit amount, every withdrawal payout, and every per-batch
   prize funding amount the pool sends the vault. The word that matters is retroactive: an
   observer appointed at any future time can decrypt amounts that are already on chain, so
   "watch for `ObserverAdded` and exit" is not a defence. Live state on 2 September 2026:
   `observerCount()` is 0 and `observers()` is empty.
2. **Deny list and pause.** The owner can block an address, which stops it depositing,
   withdrawing or unwrapping, because each of those is a token update with that address on
   one side. A pauser role exists; live it is set to the zero address, so pausing is
   currently disabled.
3. **Upgradeability.** The implementation can be replaced by its owner, so the token's
   behaviour, including how it handles the handles it has rights on, can change under us.

Note the precise scope of item 1. There is no per-saver prize transfer in Hearth, so there
is no per-winner payout for an observer to read. What moves at the token layer is one
funding transfer per evaluation batch, from the pool to the vault, carrying the total
credited to everybody in that batch. That is a reason to keep batches from containing a
single saver in practice: a batch of one makes that total one saver's exact prize.

What an observer at the token layer would not get is Hearth's own ledger. Your principal,
your winnings, your weight and your credit live in the vault's storage, and the token has
no access-control rights on any of them. We verified that on the previous deployment: the
token address returns false for permission on a depositor's winnings and principal
handles, while the depositor and the pool return true.

So the honest statement is: use Hearth and you trust Zama's wrapper with the amounts that
cross it, exactly as any ERC-7984 app does. You do not trust it with your position.

The alternative was writing our own confidential token, which several projects in this
field did. That trades a known, audited, Zama-operated contract for one we would grade
ourselves. We would rather document the real trust boundary than manufacture a smaller
one.

## Rule 6: evaluation is not a tell, and nobody chooses the order

`evaluate(drawId, count)` takes a number, not a list of addresses. The vault walks the
saver list from a starting point derived from that draw's seed, in list order, and the
caller only decides how far to advance it. A saver who wants their own result advances the
same walk the keeper advances.

That closes two things at once.

It closes the self-evaluation tell. In an earlier version, evaluation took a list of
addresses, so a saver could compute their own outcome from the public inputs and then pay
to be evaluated only when they had won. Sending that transaction would have been a winner
tell as loud as a claim function. Now there is no transaction only a winner would send.

It closes the ordering lever. When a tier over-subscribes and runs out, whoever the walk
reaches last is short. That order is fixed by the seed, so nobody can buy a better place
with gas, and the starting point moves every draw, so no address is systematically last.
The fairness consequence is described in
[prizes and tiers](../concepts/prizes-and-tiers.md) and is limitation 11.

Every saver evaluated in a draw gets the same writes, in the same shape, whether they won
or not, because the payout goes through an encrypted select rather than a branch. The
batch a saver landed in, and their position in it, are public and say nothing about their
result.

## Rule 7: the behavioural residual

Hearth has no claim transaction, so there is no winner-shaped action to watch for.
Learning that you won is an off-chain signature that touches nothing, and the app's "Claim
prize" button sends an ordinary withdrawal that looks like every other withdrawal.

The residual is what you do next. A saver who withdraws immediately after every draw they
won, and never otherwise, hands an observer a statistical hint over time. It is weak, it
takes many draws to build, and it is entirely under the saver's control. The mitigation is
behavioural, not cryptographic: withdraw on your own schedule, or let winnings accumulate.

We state this because the alternative, claiming that on-chain behaviour reveals nothing,
is false in every design of this kind. Projects in this field that removed their claim
function came to the same conclusion and wrote it down. So do we.

## What this page does not cover

It does not cover attackers and their motives, which is the
[threat model](threat-model.md). It does not cover how to check a draw yourself, which is
[randomness and verification](randomness-and-verification.md). And it makes no claim about
network-level privacy: the IP address you connect from, the RPC provider you use and the
relayer request you send are outside the chain and outside this analysis.
