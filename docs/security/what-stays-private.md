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
| The list of saver addresses | Public | Everyone |
| When you deposited, withdrew, or were evaluated, and in which batch | Public | Everyone |
| The random seed for each draw | Public once the period ends | Everyone |
| The pool's total weight for each period | Public once the period ends | Everyone |
| The yield harvested each draw | Public once the period ends | Everyone |
| Each tier's prize size and offered liquidity | Public | Everyone |
| How many prizes each tier paid | Public after reconciliation | Everyone |
| The unfunded counter | Public at finalization | Everyone |
| Sponsor amounts and the drip rate | Public | Everyone |
| The amount you wrap into, or unwrap out of, confidential USDC | Public | Everyone |
| Every threshold any address had to beat, in any tier | Publicly computable | Everyone |

Two ways to read that table. The left column of secrets is exactly the per-person
information. The right column of public facts is exactly what an outsider needs to check
that the draw was honest. That split is the design.

## What an observer can and cannot work out

An observer with a full archive node and unlimited patience can build:

- The complete list of savers and the exact block each one acted in.
- Every draw's seed, total weight, harvest, prize sizes and prize counts.
- Every threshold every address had to beat. They can literally compute your ladder.
- The pool's total holdings in confidential USDC as an encrypted handle, which they
  cannot read.

They cannot get:

- Any individual balance, at any time.
- Any individual weight, so no individual's odds.
- Which addresses won any draw, or how much anyone was paid.
- The split of the published total weight across the savers.

The gap between those two lists is what Hearth sells.

## Rule 1: the anonymity set

The pool's total weight is published every draw. That is what makes the draw checkable,
and it is also the main structural leak, because a total over a small group is not much
of a hiding place.

- **One saver.** The published total is that saver's weight. They are fully exposed.
- **Two savers.** Each of them can subtract their own weight from the total and learn the
  other's exactly.
- **Three or more.** Any split of the total consistent with the number of savers is
  possible, and the set grows with every additional saver.

The app states this whenever the pool has fewer than three savers. Zama's own
documentation makes the same point about their batcher, in the same words: "the sum of
one value is the value."

There is a second-order version of the same thing. Aggregates from consecutive periods
can be differenced. If exactly one saver changed their balance between period `p` and
period `p+1`, the change in the published total bounds that saver's change. In a busy
pool this is noise. In a quiet pool with a handful of savers it is a real signal, and no
contract can remove it while publishing the total that makes the draw verifiable. We
publish the total because a draw nobody can check is worth less than a draw with a known,
stated seam.

## Rule 2: the token layer is Zama's, not ours

Hearth's asset is Zama's confidential USDC. That is deliberate, and it means the token's
own powers apply to money moving through Hearth. Naming them:

The Sepolia contract is a `ConfidentialWrapper` behind an upgradeable proxy, owned by
Zama, with two-step ownership and renouncing disabled. Reading its verified source on 2
September 2026 gives three facts that matter for privacy:

1. **Observers.** The owner can call `addObserver(address)`, which grants that address
   wildcard user-decryption over every handle the token contract holds rights on. In
   practice that covers the pool's confidential USDC balance, every deposit amount, every
   withdrawal payout, and every prize payout, because those all pass through the token.
   Live state on 2 September 2026: `observerCount()` is 0 and `observers()` is empty.
2. **Deny list and pause.** The owner can block an address, which stops it depositing,
   withdrawing or unwrapping, because each of those is a token update with that address
   on one side. A pauser role exists; live it is set to the zero address, so pausing is
   currently disabled.
3. **Upgradeability.** The implementation can be replaced by its owner, so the token's
   behaviour, including how it handles the handles it has rights on, can change under us.

What an observer at the token layer would *not* get is Hearth's own ledger. Your
principal, your winnings, your weight and your credit live in the vault's storage, and
the token has no access-control rights on any of them. We verified that on the previous
deployment: the token address returns false for permission on a depositor's winnings and
principal handles, while the depositor and the pool return true.

So the honest statement is: use Hearth and you trust Zama's wrapper with the amounts that
cross it, exactly as any ERC-7984 app does. You do not trust it with your position.

The alternative was writing our own confidential token, which several projects in this
field did. That trades a known, audited, Zama-operated contract for one we would grade
ourselves. We would rather document the real trust boundary than manufacture a smaller
one.

## Rule 3: the wrap seam

Turning public USDC into confidential USDC is a public ERC-20 movement. The amount
appears in the wrapper's `Wrap` event, in the underlying token's `Transfer`, and again in
the coprocessor's record of encrypting that plaintext. There is no confidential way to
convert a public token.

That alone is fine. The seam opens when a wrap is tightly correlated with a deposit.

We measured it on our own earlier deployment. Scanning Sepolia blocks 11528000 to
11618500, three of five deposits sat two to four blocks after a public wrap of exactly
100 USDC by the same address. Anyone reading public logs could price those three deposits
at 100 USDC without breaking a single cryptographic guarantee. Zama documents the same
effect for their batcher and calls it shield-join correlation.

What Hearth does about it:

- Wrap and deposit are separate steps in the app, never one button, so the amounts and
  the timing need not match.
- The app says why, at the wrap step, rather than hiding the trade-off.
- A saver can wrap once and deposit in several unrelated pieces later, or keep a standing
  confidential balance and never wrap near a deposit again.

What Hearth does not do about it: eliminate it. A saver who wraps and immediately
deposits the same amount has published an upper bound on their deposit, and no contract
change can undo that.

## Rule 4: the behavioural residual

Hearth has no claim transaction, so there is no winner-shaped action to watch for.
Learning that you won is an off-chain signature that touches nothing.

The residual is what you do next. A saver who withdraws immediately after every draw they
won, and never otherwise, hands an observer a statistical hint over time. It is weak, it
takes many draws to build, and it is entirely under the saver's control. The mitigation
is behavioural, not cryptographic: withdraw on your own schedule, or let winnings
accumulate.

We state this because the alternative, claiming that on-chain behaviour reveals nothing,
is false in every design of this kind. Projects in this field that removed their claim
function came to the same conclusion and wrote it down. So do we.

## Rule 5: evaluation order is public and outcome-free

Every saver evaluated in a draw gets the same writes, in the same shape, whether they won
or not, because the payout goes through an encrypted select rather than a branch. The
batch a saver landed in, and their position in it, are public and say nothing about their
result.

Order does matter in one narrow case: if a tier is over-subscribed and runs out, savers
evaluated later get less or nothing. That is a fairness limitation, described in
[prizes and tiers](../concepts/prizes-and-tiers.md), not a privacy one. Evaluation is
permissionless, so a saver who cares can put themselves first.

## What this page does not cover

It does not cover attackers and their motives, which is the
[threat model](threat-model.md). It does not cover how to check a draw yourself, which is
[randomness and verification](randomness-and-verification.md). And it makes no claim
about network-level privacy: the IP address you connect from, the RPC provider you use
and the relayer request you send are outside the chain and outside this analysis.
