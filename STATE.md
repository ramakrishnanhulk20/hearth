# State

Updated 3 September 2026, during the Sepolia deployment.

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
- Fairness (240 scored draws) and invariant (27 periods, 211 checks) tests green; the whole
  contract suite is 35 tests. Executed attack scripts: 10 of the 12 threat-model rows run
  locally and pass, transcript under `docs/security/attacks`.
- Every tier now reconciles every draw so the jackpot accumulates in public; docs follow.
- Sepolia deployed and verified (addresses below), 10,000 USDC sponsored at 20 an hour,
  saver index 2 in with 1,200 USDC. The legacy relayer SDK cannot decrypt against the live
  KMS any more; tooling is moving to `@zama-fhe/sdk` 3.5.1 (in progress).

## Next

- Finish the SDK migration, seed savers 3 to 6, run the keeper through at least two draws,
  prove-it output, attack scripts run live, threat model finalised, README numbers.
- Then the app rewire, the docs route, the README numbers, and the submission package.

## Blocked on Ram

Nothing right now. Coming up on his list: 25 LINK from the Chainlink faucet if he wants
the Automation redundancy registered, the Vercel deploy, the video, the X post, and the
push to GitHub when he says so.

## Live addresses

Sepolia, deployed 2 September 2026 at block 11622398, all three verified on Etherscan:

| Contract | Address |
| --- | --- |
| HearthVault | 0x0F93e5db6027b4FB1C76566d24aA2D2E417fAF52 |
| HearthPrizePool | 0xA0785AacF30B6FE46EDc53CD8A9db1d94FeF5Df2 |
| SponsoredYieldSource | 0xCC49DF69eAB6884fD8DD9260902B8A0Abc9D6b91 |

Period 1 started at 1788386400 (22:00 UTC), one hour each. Asset is Zama's cUSDCMock
0x7c5BF43B851c1dff1a4feE8dB225b87f2C223639 over USDCMock 0x9b5Cd13b8eFbB58Dc25A05CF411D8056058aDFfF.

Previous contract, superseded: `LanternPool` 0xcB8b2f86Ea3d88dB47c54d7844bCD6f6D0fCfC75.
