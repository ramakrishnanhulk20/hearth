# State

Updated 3 September 2026, 01:00 UTC, after the first live draws.

## Done

- Intake complete: program, docs, PoolTogether V5, Sepolia yield venues, fourteen
  rivals, executed audit of the previous contract. Evidence under `reference/`.
- Design in `ARCHITECTURE.md`, revised after two adversarial reviews; every decision in
  `DECISIONS.md`; milestones in `PLAN.md`.
- Git hooks installed and proven; `RECOVERY_PHRASE` wired in; ten Sepolia accounts derive
  from it: index 0 deploys, 1 keeps, 2 to 6 are the demo savers, 6 also proves.
- Contracts, third pass: `HearthVault`, `HearthPrizePool`, `SponsoredYieldSource`; 35 tests
  green on the mock including the fairness run (240 draws, 239 scored) and the invariant walk
  (27 periods); solhint clean; slither's 85 results explained on
  `docs/security/static-analysis.md`; executed attack scripts, 10 of 12 rows locally.
- Every tier reconciles every draw so the jackpot accumulates in public; docs follow.
- Sepolia deployed at block 11622398 and verified (addresses below); 10,000 USDC sponsored
  at 20 an hour; five savers in (1,200 / 600 / 300 / 150 / 75 USDC).
- The legacy relayer SDK cannot decrypt against the live KMS; the tasks and the keeper run
  on `@zama-fhe/sdk` 3.5.1, regenerating the transport key pair when a KMS party serves a
  bad share, which happens often.
- Keeper live under pm2 as `hearth-keeper` from account index 1, 59 offline tests. Draws 1
  and 2 closed, awarded against KMS-signed proofs and evaluated by it.
- The prove-it command ran end to end on Sepolia: nine steps, 260 seconds, transcript in
  the README. The attack scripts ran live: the three rows a public network can run pass,
  transcript under `docs/security/attacks`.
- The app is Hearth: three-contract wiring, wrap kept apart from deposit, Reveal per panel
  with one shared permit, the claim button as a withdraw, the draw ceremony on /lab, the
  verify page, the /docs site rendered from the markdown, next 16 and wagmi 3 with zero
  production audit findings. English only, because the ten locale files could not be
  regenerated honestly. Dev server on localhost:3000.
- README with the live transcript, judge paths naming the real buttons, licence,
  submission drafts rewritten against the real screens.

## Next

- Fill the last gas placeholders from the finalize and reconcile receipts, the worked
  example from draw 2's reconcile, and the test output after switching the root back to
  `@fhevm/solidity` 0.11.1 with `npm run fhe:test`; commit the root manifest.
- Finishing sweep from section 13 of the build manual, then the retro.

## Blocked on Ram

- Look at localhost:3000: the hero, /app with a Sepolia wallet (every write path is proven
  by the operator tasks and by selector checks, not yet by a click in a browser), /lab and
  "Open the seal", /verify, /docs.
- Two design calls made in his absence, each reversible by one redeploy: every tier
  reconciles every draw (visible accumulating jackpot, per-draw prize counts public a draw
  later), and the exact aggregate is never published, only its power-of-two bracket.
- His list: the Vercel deploy (settings in `submission/vercel.md`), the video
  (`submission/video-script.md`), the X post (`submission/x-post.md`), the push to GitHub,
  and optionally 25 LINK for a Chainlink time-based upkeep and a logon hook so pm2 survives
  a reboot.

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
