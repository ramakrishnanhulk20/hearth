# Intake: Zama Developer Program, Mainnet Season 4

Written 2 September 2026 from the program page, the submission form, the Zama docs, the
PoolTogether V5 source, fourteen rival repositories and an executed audit of the contract
that was live at the time. Every source is saved under `reference/` (gitignored).

## 1. Program facts

- Company: Zama. Tech to showcase: the Zama Protocol (FHEVM), confidential tokens
  (ERC-7984) and encrypted randomness (`FHE.randEuint64`).
- Platform: Ethereum Sepolia for the live deployment. Mainnet is where a real product
  would run; the confidential USDC wrapper exists on both.
- Track: one bounty this season, "Build the Confidential PoolTogether App".
- Prize: 5,000 cUSDT, up to three winners, "not fixed by placement, an exceptional
  project may receive the full prize pool". The strongest entry may be selected for
  further development with a Zama-sponsored OpenZeppelin audit.
- Deadline, stated as a fact: 5 September 2026, 23:59 Anywhere on Earth.
- Submission form fields: email, GitHub profile, X profile, project name, description,
  contract repo link, frontend repo link, demo website, video pitch (3 minutes maximum,
  real person, normal speed, hosted on X, YouTube or Loom), link to an X post tagging
  @zama with #ZamaDeveloperProgram. One submission per email, not editable after
  sending. A project name containing "Zama" is disqualified.
- Required in the product: live URL usable with a wallet; full cycle deposit, draw,
  claim, withdraw on chain; balances encrypted (ERC-7984 or encrypted integers);
  winners chosen on chain with FHE randomness, weighted by deposit, over encrypted
  balances, no off-chain randomness, leakage documented; principal withdrawable at any
  time; draws automated or a documented keeper flow; EIP-712 user decryption of balance
  and winnings; a faucet or instructions for the test token; public open-source repo.
- Required in the README: live URL, how the pool and draws work, the confidentiality
  design (what stays encrypted, what leaks), the yield-source mock and how a real
  source plugs in, deployment scripts.
- Video must show: a deposit, decrypting the pool balance, a draw being triggered, a
  claim, a withdrawal, and a short explanation of why selection is fair and private.

## 2. Scoring table

| Criterion, verbatim | What it rewards in practice |
|---|---|
| Correctness: do deposit, draw, claim and withdraw produce the expected results on chain? Are EIP-712 flows implemented correctly? | A live pool that never strands money, a decryption flow that works in a browser |
| Confidentiality design: what stays encrypted? Is winner selection provably fair and deposit-weighted? Is any leakage minimal and documented? | A written leakage table, a verifiable draw, no behavioural tells |
| UX: is the app pleasant to use? Does it handle approvals and errors gracefully? | Approval, insufficient balance, wrong network and unsupported token all handled |
| Code quality: clean, readable, well-typed, well-documented | NatSpec, tests, typed frontend, no scaffold leftovers |
| Production-readiness: is the live deployment stable on Sepolia? Could a real user trust it today? | Time-weighted odds, automation, pause and rescue paths, a threat model |

The dimension nobody in the field is contesting: production-readiness in the full
PoolTogether sense (time-weighted odds, no per-saver draw cost, no claim tell, automated
draws) combined with a front end and documentation a real user would trust. Every rival
answered "polished UX" with a table of measurements.

## 3. How the last winners won

- Season 3 bounty (wrapper registry app): first place had a 17-line contract and the
  widest product scope; second and third were front-end-only. Judges rewarded coverage,
  UX and an honest README over contract depth. A losing entrant complained, unanswered,
  that all three lacked error recovery; the Season 4 criteria repeat the error-handling
  question.
- Season 3 builder winners with contracts (Circux, ZamaDrop, Ghostlend) shared a shape:
  factory or clean modules, 30 to 40 tests, a "hidden versus public" table, a
  limitations list, a self-audit, Mermaid diagrams, and verified addresses.
- Repeat winners dominate every season; the same people ship every time.

## 4. The core tech, in one paragraph

Zama's FHEVM lets a Solidity contract add, compare and select over encrypted numbers
without ever decrypting them. Balances live on chain as handles to ciphertexts. Access is
gated by an on-chain ACL; a user decrypts their own values through the relayer with an
EIP-712 signature; a contract can mark a value publicly decryptable and later verify the
KMS-signed cleartext on chain with `FHE.checkSignatures`. Randomness comes from
`FHE.randEuint64`, produced inside the coprocessor from a public seed under the FHE key,
so nobody can predict or re-roll it. Confidential USDC is Zama's own ERC-7984 wrapper.
The exact calls we use: `FHE.fromExternal`, `FHE.add/sub/min/gt/select/mul`,
`FHE.randEuint64`, `FHE.allow/allowThis/allowTransient/makePubliclyDecryptable`,
`FHE.checkSignatures`, ERC-7984 `confidentialTransferAndCall` and
`confidentialTransfer`.

Per-transaction limits on Sepolia today: 20,000,000 compute units in total and
5,000,000 in sequential depth. A 64-bit encrypted add costs 162,000, a compare about
118,000, a select 55,000, a 64-bit multiply by a public number 365,000.

## 5. Architecture candidates

The idea is fixed by the bounty, so the candidates are shapes of the draw engine.

| Test | A. Harden the scan | B. PoolTogether V5, confidential | C. Hybrid |
|---|---|---|---|
| Delete test: remove FHE, does it collapse? | Yes | Yes | Yes |
| Serious business: a real saver would use it | With time weighting added | Yes, it is the real PoolTogether design | Yes |
| Uncontested dimension | No: same shape as 9 of 14 rivals | Yes: scalable, automated, no claim tell | Partly |
| Novelty against the field | Low | Two rivals attempted it; neither finished the production rails | Low |
| Demo-ability in two minutes | Good | Good, with a verify page | Good |
| Build risk | Low | Medium: encrypted TWAB and proofs are new code | High: two engines |
| Cost per draw | One transaction per 29 savers, chained | Close in one transaction, then independent per-saver batches | Both |

## 6. Recommendation

Build B. It is what PoolTogether actually is, it removes the four executed flaws of the
scan design by construction, and it is the only shape that lets the front end and the
documentation, which nobody else has, sit on top of a contract a judge cannot fault.
Ram picked B on 2 September 2026 and delegated the remaining choices to the build.
