# State

Updated 3 September 2026, during milestone 1.

## Done

- Intake complete: program, docs, PoolTogether V5, Sepolia yield venues, fourteen
  rivals, executed audit of the previous contract. Evidence under `reference/`.
- Ram's decisions recorded in `DECISIONS.md`; design in `ARCHITECTURE.md`, revised after
  an adversarial design review; milestones in `PLAN.md`.
- Git hooks installed and proven (bad commits rejected); repo identity set; baseline
  commit made; `RECOVERY_PHRASE` wired into the Hardhat config; ten Sepolia accounts derive
  from it, the first is the deployer with 8.28 ETH, the rest are unfunded.
- First draft of `HearthVault`, `HearthPrizePool`, `SponsoredYieldSource`, interfaces and
  libraries compiles and lints; library and yield-source tests pass; the full-cycle test
  is being fixed on the mock.
- Python 3.12 and slither 0.11.6 installed for static analysis.

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
