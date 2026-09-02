# State

Updated 3 September 2026, during milestone 2.

## Done

- Intake complete: program, docs, PoolTogether V5, Sepolia yield venues, fourteen
  rivals, executed audit of the previous contract. Evidence under `reference/`.
- Design in `ARCHITECTURE.md`, revised after two adversarial reviews (one on the spec, one
  on the spec plus the first draft); every decision in `DECISIONS.md`; milestones in
  `PLAN.md`.
- Git hooks installed and proven; repo identity set; `RECOVERY_PHRASE` wired in; ten
  Sepolia accounts derive from it, the first is the deployer with 8.28 ETH.
- Contracts, third pass: `HearthVault`, `HearthPrizePool`, `SponsoredYieldSource`,
  interfaces and libraries compile and lint clean; 32 tests green on the mock; batch limit
  measured at four savers per evaluation on the Sepolia tiers.
- Keeper package built with 52 offline tests; documentation pages (19) written to the
  third design; README and submission drafts written with placeholders; MIT licence.
- Deploy script, network config and operator tasks (spread gas, seed, status, draw,
  verify, prove) built and run end to end on a local node twice; the prove-it command
  leaves the pool as it found it and recomputes its own credit from the public thresholds.
  Account roles: index 0 deploys, 1 keeps, 2 to 6 are the demo savers, 6 also proves.
- Static analysis: solhint clean; slither run in a plugin-free copy, 85 results in five
  families, every one explained on `docs/security/static-analysis.md`; npm audit read,
  28 production findings all in the web package's dependency tree, to be cleared by the
  web upgrade in the app milestone.
- `fhe:ship` builds against `@fhevm/solidity` 0.13.2, since the Hardhat plugin 0.4.2
  rejects 0.13.3 on a text check.

## Next

- Fairness and invariant tests (in progress); executed attack scripts (in progress).
- `npm audit fix` for the non-breaking dev findings once no agent is compiling.
- Sepolia: ship build, deploy, verify, spread gas, seed, keeper through at least two
  draws, prove-it output, attack scripts run live, threat model finalised.
- Then the app rewire, the docs route, the README numbers, and the submission package.

## Blocked on Ram

Nothing right now. Coming up on his list: 25 LINK from the Chainlink faucet if he wants
the Automation redundancy registered, the Vercel deploy, the video, the X post, and the
push to GitHub when he says so.

## Live addresses

Previous contract, kept for reference until the new deployment replaces it:
`LanternPool` 0xcB8b2f86Ea3d88dB47c54d7844bCD6f6D0fCfC75 on Sepolia, verified.
