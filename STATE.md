# State

Updated 3 September 2026, during milestone 1.

## Done

- Intake complete: program, docs, PoolTogether V5, Sepolia yield venues, fourteen
  rivals, executed audit of the previous contract. Evidence under .
- Design in , revised after two adversarial reviews (one on the spec, one
  on the spec plus the first draft); every decision in ; milestones in
  .
- Git hooks installed and proven; repo identity set;  wired in; ten
  Sepolia accounts derive from it, the first is the deployer with 8.28 ETH.
- Contracts, third pass: , , ,
  interfaces, libraries, compile and lint clean; 32 tests green on the mock; batch limit
  measured at four savers per evaluation on the Sepolia tiers.
- Keeper package built with 52 offline tests; documentation pages (18) written to the
  third design; README and submission drafts in progress.
- Python 3.12 and slither 0.11.6 installed.

## Next

- Third contract pass in progress: aggregate published only as its power-of-two bracket,
  prize sizes fixed at close, seed-ordered evaluation walk, per-tier reconcile cadence with
  an encrypted carry, withdraw clamped to the vault balance, threshold view.
- In parallel: documentation pages being revised to that design; keeper package being built.
- Then: deploy script and Sepolia config, seed and prove-it scripts, fairness and invariant
  tests, static analysis, Sepolia deployment and verification, self-audit, app rewire, docs
  site, README, submission drafts.

## Blocked on Ram

Nothing right now. Coming up on his list: 25 LINK from the Chainlink faucet if he wants
the Automation redundancy registered, the Vercel deploy, the video, the X post, and the
push to GitHub when he says so.

## Live addresses

Previous contract, kept for reference until the new deployment replaces it:
`LanternPool` 0xcB8b2f86Ea3d88dB47c54d7844bCD6f6D0fCfC75 on Sepolia, verified.
