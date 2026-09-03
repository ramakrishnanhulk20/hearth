# State

Updated 3 September 2026, 06:00 UTC, after the finishing audit and its fix pass.

## Done

- Intake, design and decisions: `INTAKE.md`, `ARCHITECTURE.md`, `DECISIONS.md`, `PLAN.md`.
- Contracts: `HearthVault`, `HearthPrizePool`, `SponsoredYieldSource`. 35 tests green on the
  mock, including a fairness run of 239 scored draws and an invariant walk over 27 periods.
  solhint clean; slither's 85 results explained on `docs/security/static-analysis.md`.
- Keeper: 65 offline tests. Runs under pm2 as `hearth-keeper` from account index 1.
- Sepolia: deployed at block 11622398, all three contracts verified on Etherscan. 10,000 USDC
  sponsored at 20 an hour, five savers in (1,200 / 600 / 300 / 150 / 75 USDC).
- Seven draws have run end to end: closed, awarded against KMS-signed proofs, evaluated for
  every saver, finalized and reconciled. The grand prize has grown from nothing to 10.42 USDC
  as unwon money returns, and the encrypted bracket corrected itself from 2^42 to 2^43 without
  the exact aggregate ever being published.
- The prove-it command ran end to end on Sepolia: nine steps, 260 seconds, transcript in the
  README. The attack scripts ran live; the three rows a public network can run pass, transcript
  under `docs/security/attacks`.
- The app is Hearth: three-contract wiring, wrap kept apart from deposit, Reveal per panel with
  one shared permit, the claim button as an ordinary withdraw, the draw ceremony on /lab, the
  verify page, and a GitBook-style /docs site rendered from the markdown at build time. next 16
  and wagmi 3, zero production audit findings. English only.
- Finishing audit: ten dimensions, 88 findings raised, each refuted three ways, 47 confirmed and
  fixed. The worst was a claim that a mainnet yield adapter was written and tested when no such
  contract exists; that claim is gone from all four documents and the three dependency diagrams
  now mark it as an unbuilt design. A double-claim bug that would have sent a second withdrawal
  is fixed. The keeper now reconciles before it closes, so returned prize money is offered in the
  same pass rather than the next one, proven by six new tests that fail against the old order.

## Next

- Nothing is blocked on me. The repository is submission-ready apart from the five URLs below.

## Blocked on Ram

- Look at localhost:3000: the hero, then the console at /app with a Sepolia wallet connected,
  walking Deposit, the eye on the dashboard, My draws and Withdraw. Also /lab and "Open the
  seal", /verify and /docs. Every write path is proven by the operator tasks and by selector
  checks against the deployed bytecode, not yet by a click in a browser, so one real deposit,
  reveal, claim and withdraw is the last gap in the evidence.
- One thing nobody has painted yet: the landing page with prefers-reduced-motion on.
- Two design calls made in his absence, each reversible by one redeploy: every tier reconciles
  every draw (a visible accumulating jackpot, with per-draw prize counts public a draw later),
  and the exact aggregate is never published, only its power-of-two bracket.
- His list: the Vercel deploy (settings in `submission/vercel.md`), the video
  (`submission/video-script.md`), the X post (`submission/x-post.md`), the push to GitHub, and
  optionally 25 LINK for a Chainlink time-based upkeep and a logon hook so pm2 survives a reboot.
- Five placeholders wait on those steps: `{{APP_URL}}`, `{{DOCS_URL}}`, `{{REPO_URL}}`,
  `{{VIDEO_URL}}`, `{{X_POST_URL}}`.

## Live addresses

Sepolia, deployed 2 September 2026 at block 11622398, all three verified on Etherscan:

| Contract | Address |
| --- | --- |
| HearthVault | 0x0F93e5db6027b4FB1C76566d24aA2D2E417fAF52 |
| HearthPrizePool | 0xA0785AacF30B6FE46EDc53CD8A9db1d94FeF5Df2 |
| SponsoredYieldSource | 0xCC49DF69eAB6884fD8DD9260902B8A0Abc9D6b91 |

Period 1 started at 1788386400 (22:00 UTC), one hour each. The asset is Zama's cUSDCMock
0x7c5BF43B851c1dff1a4feE8dB225b87f2C223639 over USDCMock 0x9b5Cd13b8eFbB58Dc25A05CF411D8056058aDFfF.

Previous contract, superseded: `LanternPool` 0xcB8b2f86Ea3d88dB47c54d7844bCD6f6D0fCfC75.
