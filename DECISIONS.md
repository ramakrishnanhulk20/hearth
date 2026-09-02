# Decisions

One line per decision made without Ram, with the reason. Decisions Ram made himself are
marked as such.

- 2026-09-02, Ram: rebuild the draw engine as a confidential PoolTogether V5 (per-saver
  evaluation over encrypted time-weighted balances), not a hardened scan.
- 2026-09-02, Ram: publish the per-draw aggregate weight and the random seed, and say
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
- 2026-09-02: three prize tiers with independent per-tier randomness, V5 maths, prize
  count folded into the winning zone so each saver wins at most one prize per tier.
- 2026-09-02: tier over-subscription is handled by an encrypted remaining-liquidity
  counter per tier per draw, clamping each payout, and by offering only half of a tier's
  liquidity per draw (V5's utilisation rate). Paid totals per tier are decrypted once per
  draw to reconcile; that reveals how many prizes were paid, never to whom.
- 2026-09-02: encrypted TWAB keeps two observations per saver with the cumulative reset
  at each period start, so a 64-bit accumulator cannot overflow; evaluation for draw p
  is open during period p+1, as in V5.
- 2026-09-02: core contracts are immutable. Owner powers are two-step ownership with
  renounce disabled, a pause that stops deposits and draw closing only, never
  withdrawals or evaluation, a yield-source setter, and a rescue for foreign ERC-20s.
- 2026-09-02: yield source is an interface. Live on Sepolia: a sponsored source that
  drips at a set rate from a sponsor-funded confidential USDC balance, because no venue
  on Sepolia pays yield on Zama's mock USDC (Aave refuses USDC deposits, cap exceeded;
  Compound needs Circle's USDC; Zama's own vault batcher is idle there). The Zama
  Confidential Vault adapter is the documented mainnet path.
- 2026-09-02: Sepolia draw period is 30 minutes so a visitor can see a full cycle; the
  README states a daily period for mainnet. The period is a constructor parameter.
- 2026-09-02: the keeper is a script we host (close, fetch decryption proofs, award,
  evaluate savers in batches); Chainlink Automation time-based upkeep is documented as
  redundancy for the close step, which needs no off-chain proof.
- 2026-09-02: no registration bond. Fake savers no longer affect the draw, only the
  keeper's evaluation budget, which is capped per draw and prioritised by recency.
- 2026-09-02: `RECOVERY_PHRASE` accepted as the seed-phrase variable, `MNEMONIC` kept.
- 2026-09-02: `reference/` is gitignored; it holds vendor docs and rival code.
- 2026-09-02: git identity set repo-locally to Ram's name and email.
