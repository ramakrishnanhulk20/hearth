# Plan

## Design DNA

```
PROGRAM / COMPANY:   Zama Developer Program, Mainnet Season 4, bounty "Build the Confidential PoolTogether App"
PROGRAM LINK:        https://www.zama.org/post/zama-developer-program-mainnet-season-4
ARCHETYPE:           A. Contract dapp
THEIR CORE TECH:     FHEVM encrypted integers and ERC-7984 confidential USDC, FHE.randEuint64 randomness,
                     EIP-712 user decryption, KMS-signed public decryption verified on chain
UNCONTESTED SCORE:   production-readiness in the full PoolTogether sense, on a front end and docs nobody else has
CHAIN / LANGUAGE:    Ethereum Sepolia (mainnet-ready), Solidity 0.8.27
BACKEND SCOPE:       contracts + an off-chain keeper script; no database
PROJECT NAME:        Hearth
ONE-LINE PITCH:      Prize savings where nobody, not even us, can see what you saved or what you won.
SUBMISSION NEEDS:    public repo, live URL on Sepolia, README, docs site, three Mermaid diagrams,
                     3-minute real-person video, X post
VIBE:                dark-3d (the existing glass-lantern hero, flame accent, grain), kept from the earlier build
ACCENT COLOR:        flame yellow #F9D100 on near-black
SIGNATURE MOMENT:    the draw ceremony: the sealed seed opens, thresholds fall across the pool, and the
                     visitor's own result decrypts only for them
REFERENCES:          the approved earlier hero; new screens go to /lab first
IMAGES PROVIDED:     none, the hero is generated in WebGL
```

## Architecture

See `ARCHITECTURE.md`. Ram chose the PoolTogether V5 port on 2 September 2026 and
delegated the remaining choices; each is logged in `DECISIONS.md`.

## R&D brief, in short

- Library versions: `@fhevm/solidity` 0.11.1 for local tests (the Hardhat plugin 0.4.2
  pins it), 0.13.3 for the Sepolia build via `scripts/use-fhe.mjs`;
  `@openzeppelin/confidential-contracts` 0.5.3; `@openzeppelin/contracts` 5.6.1;
  `@zama-fhe/sdk` 3.5.1 in the app; Hardhat 2.x.
- Zama functions used: listed in `INTAKE.md` section 4.
- Limits that shape the design: 20,000,000 compute units and 5,000,000 sequential depth
  per transaction on Sepolia; `randEuint64` only inside transactions; public decryption
  is `makePubliclyDecryptable` then a relayer proof verified by `FHE.checkSignatures`.
- Main risks: the encrypted TWAB and the proof-driven award are new code paths; the
  evaluation batch size must be measured against the compute limits; the Hardhat mock
  does not seed randomness from the chain, so live draws must be exercised on Sepolia.

## Milestones, each ending in a proof gate

| # | Milestone | Gate |
|---|---|---|
| 0 | Planning files, git hooks, first local commit | A deliberately bad commit is rejected by the hooks |
| 1 | `HearthVault`, `HearthPrizePool`, `IYieldSource`, `SponsoredYieldSource` compiled with NatSpec | Unit tests pass on the mock for deposit, withdraw, TWAB, close, award with proof, evaluate, finalize, reconcile, pause, ownership |
| 2 | Property tests | Conservation of funds, no withdrawal above principal plus winnings, tier payouts never exceed liquidity, a flash deposit gets zero weight, expected winners per tier match the odds over many draws |
| 3 | Static analysis | solhint clean with a committed config; slither run or its absence justified in `DECISIONS.md` |
| 4 | Sepolia deployment | One repeatable deploy script, contracts verified on Etherscan, five funded saver wallets seeded, two draws run by the keeper, prove-it command output pasted in the README |
| 5 | Self-audit | Threat model written; attack scripts executed live: stranger decryption refused, flash deposit weight zero, fake registrations cannot stall a draw, over-subscribed tier clamps, replayed proof rejected |
| 6 | App rewired | Rename, separate wrap from deposit, reveal balance and winnings, withdraw pays winnings first, draw ceremony and verify page, every error state, mobile at 375px |
| 7 | Docs and submission package | Hand-built docs site, README in the Aruvi shape, video script, X post draft, Vercel settings, `STATE.md` handoff list |
