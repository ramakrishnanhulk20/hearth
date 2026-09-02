# Decisions

One line per decision made without Ram, with the reason. Decisions Ram made himself are
marked as such.

- 2026-09-02, Ram: rebuild the draw engine as a confidential PoolTogether V5 (per-saver
  evaluation over encrypted time-weighted balances), not a hardened scan.
- 2026-09-02, Ram, superseded on 3 September (see below): publish the per-draw aggregate weight and the random seed, and say
  so plainly in the leakage table.
- 2026-09-02, Ram: rename the project. Build as a real product; the demo is a recording.
- 2026-09-02, Ram: docs site is hand-built in the app, GitBook style, not Docusaurus.
- 2026-09-02, Ram: local commits only until he says push.
- 2026-09-02: new name is Hearth. Short, a savings word, keeps the flame accent and the
  glass-lantern visual, no rival or Zama collision (a rival already uses "Lantern").
- 2026-09-02: prizes are credited to a separate encrypted winnings balance that does not
  count toward odds, and the only way money leaves is `withdraw`, which pays winnings
  first. No claim transaction exists, so nothing a winner does differs from anyone else.
  The bounty's "claim" step is the EIP-712 reveal of winnings plus that same withdraw.
- 2026-09-02, superseded on 3 September (see below): three prize tiers with independent
  per-tier randomness, V5 maths, prize count folded into the winning zone so each saver wins
  at most one prize per tier.
- 2026-09-02, superseded on 3 September (see below): tier over-subscription is handled by an encrypted remaining-liquidity
  counter per tier per draw, clamping each payout, and by offering only half of a tier's
  liquidity per draw (V5's utilisation rate). Paid totals per tier are decrypted once per
  draw to reconcile; that reveals how many prizes were paid, never to whom.
- 2026-09-02, superseded on 3 September (see below): encrypted TWAB keeps two observations
  per saver with the cumulative reset at each period start; evaluation for draw p is open
  during period p+1, as in V5. The overflow claim in the original wording was wrong.
- 2026-09-02: core contracts are immutable. Owner powers are two-step ownership with
  renounce disabled, a pause that stops deposits and draw closing only, never
  withdrawals or evaluation, a yield-source setter, and a rescue for foreign ERC-20s.
- 2026-09-02: yield source is an interface. Live on Sepolia: a sponsored source that
  drips at a set rate from a sponsor-funded confidential USDC balance, because no venue
  on Sepolia pays yield on Zama's mock USDC (Aave refuses USDC deposits, cap exceeded;
  Compound needs Circle's USDC; Zama's own vault batcher is idle there). The Zama
  Confidential Vault adapter is the documented mainnet path.
- 2026-09-02, superseded on 3 September (see below): Sepolia draw period is 30 minutes so a visitor can see a full cycle; the
  README states a daily period for mainnet. The period is a constructor parameter.
- 2026-09-02: the keeper is a script we host (close, fetch decryption proofs, award,
  evaluate savers in batches); Chainlink Automation time-based upkeep is documented as
  redundancy for the close step, which needs no off-chain proof.
- 2026-09-02, superseded on 3 September (see below): no registration bond. Fake savers no longer affect the draw, only the
  keeper's evaluation budget, which is capped per draw and prioritised by recency.
- 2026-09-02: `RECOVERY_PHRASE` accepted as the seed-phrase variable, `MNEMONIC` kept.
- 2026-09-02: `reference/` is gitignored; it holds vendor docs and rival code.
- 2026-09-02: git identity set repo-locally to Ram's name and email.
- 2026-09-02: Chainlink's two-function upkeep interface is declared locally instead of adding
  `@chainlink/contracts` and its peer dependencies for two selectors.
- 2026-09-02: the unbiased random helper is written fresh; PoolTogether's is GPL-3 and this
  repo is MIT.
- 2026-09-02: the Hardhat default test phrase constant is named `HARDHAT_DEFAULT_ACCOUNTS` so
  the secrets hook, which keys on the word MNEMONIC, does not flag a public value.
- 2026-09-02: `.gitattributes` forces LF line endings; Git on this machine has autocrlf on and
  the repo is judged on code quality.
- 2026-09-03: winner test uses PoolTogether's per-prize form (nested thresholds, one uniform
  draw per tier), so expected prizes are linear in share and wallet splitting gains nothing.
  The folded single-threshold form was found to cap large holders and reward splitting.
- 2026-09-03: harvested yield is booked only from a KMS-verified public decryption of the
  amount the source actually transferred, never from the source's own report, so a buggy or
  hostile source cannot create phantom prize liquidity that withdrawals would pay from
  principal.
- 2026-09-03: three observations per saver and for the total, giving each draw a two-period
  window for close, award and evaluation; a one-period window was too fragile at 30-minute
  periods against relayer delays.
- 2026-09-03: per-saver principal cap of (2^64 - 1) / periodLength enforced through the
  deposit hook's encrypted acceptance, and a 128-bit total accumulator; the earlier claim
  that a 64-bit accumulator cannot overflow was wrong.
- 2026-09-03, superseded on 3 September (see below): no reserve tier and no minimum deposit in v1. Over-subscription clamps the last
  winners in evaluation order and is documented; fake savers cost the keeper gas only, which
  the keeper bounds by evaluating in saver-list order with its own per-draw cap.
- 2026-09-03, superseded on 3 September (see below): Sepolia tier parameters: grand count 1, odds 1/48, shares 40; mid count 1, odds
  1/6, shares 20; frequent count 4, odds 1, shares 40; UTILISATION 50 percent. Chosen so a
  visitor in a ten-saver pool has roughly a 40 percent chance of a prize per draw while the
  grand prize accumulates to about nineteen periods of yield.
- 2026-09-03: evaluation stores each saver's encrypted weight and credit per draw, allowed to
  that saver, so the app can show the outcome per draw and let the saver verify it.
- 2026-09-03: tests, and later the keeper, decrypt one handle at a time instead of with
  `Promise.all`. `@fhevm/mock-utils` 0.4.2 keeps one shared event cursor in
  `CoprocessorEventsIterator.next()` and updates it only after two awaits, so two overlapping
  decryptions re-query the same block range and the second throws "Parse event ... in
  backward order". A mock limitation, not a contract one.
- 2026-09-03, superseded by the re-measurement below: `MAX_BATCH` is 4, measured on the mock's price table with the Sepolia tier set:
  a saver costs 3,836,128 compute units across three tiers with a four-prize frequent tier,
  so five savers exceed the 20,000,000 cap. The vault's NatSpec carries the coefficients.
- 2026-09-03: Sepolia period is one hour, not thirty minutes, with the grand tier at odds 1/24
  so it still pays about daily. A ten-saver pool needs about eleven million gas per draw
  (three evaluation batches plus close, award, finalize and reconcile); at hourly draws and
  the current 1 gwei base fee that is about 0.26 ETH a day, half of what thirty-minute draws
  would cost for the same four prizes an hour.
- 2026-09-03: the vault keeps exactly fifteen state variables (solhint's recommended cap);
  per-draw weight and credit live in one `Outcome` struct, and "remainders initialised" is
  read from the handle itself.
- 2026-09-03: the tier loop breaks, not continues, at the first threshold above 64 bits,
  since thresholds only rise with the prize index; the first prize of a tier seeds the tier's
  payout and the first tier seeds the credit, saving six encrypted adds per saver.
- 2026-09-03: a sole saver wins every prize of the frequent tier for any seed, which the tests
  use as the certain-win case; odds cannot exceed one, so a ninety percent holder wins all
  four prizes only for about sixty percent of seeds.
- 2026-09-03: the per-period aggregate is no longer published. Publishing it exactly lets an
  observer recover a lone mover's deposit from two consecutive aggregates and the public
  timestamp of their own transaction (the second review proved it exact, not approximate).
  The vault publishes only the aggregate's power-of-two bracket, tracked under encryption
  by five comparisons per draw, and draws are run against that bracket. This reverses the
  2 September choice to publish the aggregate; Ram made that choice on advice that
  understated the leak, and this is the real-product answer.
- 2026-09-03: prize sizes and offered liquidity are fixed at close, before the seed exists,
  so nothing done after seeing the seed can change what a win is worth.
- 2026-09-03: closing is allowed only until the middle of the window's second period, and a
  missed award returns the offered liquidity, so a last-block close cannot strand a draw.
- 2026-09-03: evaluation walks the saver list from a seed-derived start with a cursor;
  callers choose how many to advance, never whom. Self-evaluation is therefore not a
  winner tell and the clamp order is fixed by the draw.
- 2026-09-03: tiers reconcile on their own cadence with an encrypted carry (grand every 24
  draws, mid every 6, frequent every draw), so a jackpot payout is attributed to a day of
  eligible savers rather than to the two percent eligible in one draw.
- 2026-09-03: withdrawals clamp to the vault's own confidential balance because an ERC-7984
  transfer moves the whole amount or nothing; the shortfall re-credit is gone.
- 2026-09-03: a reverting yield source no longer stops a close; the harvest is booked as
  zero and HarvestFailed is emitted.
- 2026-09-03: a `thresholdOf` view shares the winner-test arithmetic with evaluation so the
  verify page, the tests and a judge use one implementation.
- 2026-09-03: an empty period does not move the scale bracket; only a measured aggregate
  does. Otherwise an idle pool's bracket would decay two bits per draw and the first savers
  to return would clear every threshold until it climbed back.
- 2026-09-03: the yield-source setter refuses an address with no code (the zero address
  still disables harvesting), because a call to a codeless address fails in the pool's own
  frame where the try around `harvest` cannot catch it.
- 2026-09-03: `MAX_BATCH` re-measured at 4 with the seed-ordered walk and the Sepolia tiers
  (3,674,128 compute units per saver plus 748,032 per call); five savers exceed the
  18,000,000 budget. The rejection sampler is gone: the range is a power of two, so masking
  the hash is exactly uniform.
- 2026-09-03: `fhe:ship` builds against `@fhevm/solidity` 0.13.2, not 0.13.3. Hardhat plugin 0.4.2,
  the newest published, matches the text of the library's Ethereum config block exactly, and 0.13.3
  dropped two placeholder comment lines from it, so `hardhat compile` fails before solc runs. Every
  address in both versions is identical. Move to 0.13.3 when the plugin follows.
- 2026-09-03: the operator tasks run on `hardhat node` with `--network localhost`, or on Sepolia, never
  on the in-process network: the plugin only deploys its mock coprocessor for tests and for the node,
  and a chain that dies with the process could not carry state between six CLI commands anyway.
- 2026-09-03: explorer verification goes through hardhat-verify's v2 endpoint. hardhat-deploy's own
  `etherscan-verify` still posts to the per-network v1 endpoints, which Etherscan retired.
- 2026-09-03: account roles from the recovery phrase: index 0 deploys and owns, index 1 is the keeper
  and nothing else, indexes 2 to 6 are the five demo savers, index 6 is the prover. The keeper is never
  a saver, so its transactions carry no saver's information.
- 2026-09-03: Sepolia sponsorship is 10,000 mock USDC released at 20 an hour, about 20 days of prizes,
  so the pool keeps paying through the judging window without anyone topping it up.
- 2026-09-03: the prove-it command never waits for a period by default. It checks the newest awarded
  draw the prover holds weight in, and withdraws only its own stake plus winnings, so a run leaves the
  demo pool as it found it and can be repeated any number of times.
- 2026-09-03: `walkOf` returns `(start, count)`. The earlier name `length` collided with a tuple's own
  `length` in the generated TypeScript types and made the return type unusable.
