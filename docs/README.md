# Hearth documentation

Hearth is confidential no-loss prize savings on the Zama Protocol. You deposit a
confidential token, your balance stays encrypted on chain, the yield the pool earns is
handed out as prizes in a periodic draw, and your principal is withdrawable at any time.
Nobody, including us, can read what you saved or what you won.

Seven pools run on Sepolia, one per confidential token Zama publishes there, each with its
own contracts and its own keeper. Most pages below use USDC in their worked examples,
because that is the pool with the longest history; every one of them describes all seven.

These pages are the full written record of how it works and what it does not hide.
`ARCHITECTURE.md` in the repository root is the implementation specification; this tree
is the same design explained for the people who use it and the people who audit it.

## Pages

| Page | What it covers |
| --- | --- |
| [getting-started/what-is-hearth.md](getting-started/what-is-hearth.md) | The product in one page: the four moves a saver makes, and exactly what each one hides. |
| [getting-started/try-it-on-sepolia.md](getting-started/try-it-on-sepolia.md) | Picking one of the seven tokens, its faucet, shielding, depositing, a draw, revealing, claiming, withdrawing, unshielding. |
| [concepts/pools-and-tokens.md](concepts/pools-and-tokens.md) | The seven pools and their addresses, why six of them draw every six hours, the seeded stakes per token, the token Hearth refuses, and the per-pool routes. |
| [concepts/how-a-draw-works.md](concepts/how-a-draw-works.md) | Periods, the two-period window and the close deadline, the five steps of a draw, and what the vault publishes instead of the pool's total. |
| [concepts/time-weighted-balance.md](concepts/time-weighted-balance.md) | Why odds use your average balance over the period, what a late deposit is worth, and why three saved observations are enough. |
| [concepts/winner-selection.md](concepts/winner-selection.md) | The winner test, PoolTogether's per-prize rule, the nested thresholds against the published bracket, and a worked example with three savers. |
| [concepts/prizes-and-tiers.md](concepts/prizes-and-tiers.md) | How yield becomes prize liquidity, the encrypted carry and the reconcile cadence, the three Sepolia tiers, over-subscription, and where we deviate from PoolTogether V5. |
| [concepts/yield-source.md](concepts/yield-source.md) | The sponsored source on Sepolia, why the harvest is verified rather than reported, and how Zama's Confidential Vault plugs in on mainnet. |
| [concepts/why-zama.md](concepts/why-zama.md) | The delete test: take fully homomorphic encryption out and there is no product. Every Zama piece we use, named. |
| [security/what-stays-private.md](security/what-stays-private.md) | Seven rules: the bracket and the leak it replaced, what a pinned balance costs, the wrap seam in both directions, what the prize counts measure, the token layer, why evaluation is not a tell, and the behavioural residual. |
| [security/threat-model.md](security/threat-model.md) | Nine attackers, what each wants, what stops them, and what does not. Plus the executed failures of our previous design. |
| [security/randomness-and-verification.md](security/randomness-and-verification.md) | Where the seed comes from, why nobody can re-roll it or resize what it wins, and how anyone recomputes a threshold after the fact. |
| [security/static-analysis.md](security/static-analysis.md) | The slither and solhint runs, and the one reason behind each of the five families of findings. |
| [operations/keeper.md](operations/keeper.md) | The keeper's job step by step, the ordering rule, one process per pool, what happens when it is down, and the gas budget. |
| [operations/deploying.md](operations/deploying.md) | Deploying one pool per token, constructor signatures and parameters, verification, and the two Sepolia parameter sets against a mainnet one. |
| [limitations.md](limitations.md) | Every documented limitation in one numbered list of fourteen. |
| [faq.md](faq.md) | Twelve short answers, starting with which of the seven tokens you can save in, and including where the claim button went. |

