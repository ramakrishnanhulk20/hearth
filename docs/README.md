# Hearth documentation

Hearth is confidential no-loss prize savings on the Zama Protocol. You deposit
confidential USDC, your balance stays encrypted on chain, the yield the pool earns is
handed out as prizes in a periodic draw, and your principal is withdrawable at any time.
Nobody, including us, can read what you saved or what you won.

These pages are the full written record of how it works and what it does not hide.
`ARCHITECTURE.md` in the repository root is the implementation specification; this tree
is the same design explained for the people who use it and the judges who score it.

## Pages

| Page | What it covers |
| --- | --- |
| [getting-started/what-is-hearth.md](getting-started/what-is-hearth.md) | The product in one page: the four moves a saver makes, and exactly what each one hides. |
| [getting-started/try-it-on-sepolia.md](getting-started/try-it-on-sepolia.md) | Test ETH, the mock USDC faucet, shielding, depositing, a draw, revealing, claiming, withdrawing, unshielding. |
| [concepts/how-a-draw-works.md](concepts/how-a-draw-works.md) | Periods, the two-period window, and the five steps of a draw, with the end-to-end sequence diagram. |
| [concepts/time-weighted-balance.md](concepts/time-weighted-balance.md) | Why odds use your average balance over the period, what a late deposit is worth, and why three saved observations are enough. |
| [concepts/winner-selection.md](concepts/winner-selection.md) | The winner test, PoolTogether's per-prize rule, the nested thresholds, and a worked example with three savers. |
| [concepts/prizes-and-tiers.md](concepts/prizes-and-tiers.md) | How yield becomes prize liquidity, the three Sepolia tiers and their numbers, over-subscription, and where we deviate from PoolTogether V5. |
| [concepts/yield-source.md](concepts/yield-source.md) | The sponsored source on Sepolia, why the harvest is verified rather than reported, and how Zama's Confidential Vault plugs in on mainnet. |
| [concepts/why-zama.md](concepts/why-zama.md) | The delete test: take fully homomorphic encryption out and there is no product. Every Zama piece we use, named. |
| [security/what-stays-private.md](security/what-stays-private.md) | The encrypted versus public table, the anonymity-set rule, the token layer, the wrap seam, and the behavioural residual. |
| [security/threat-model.md](security/threat-model.md) | Nine attackers, what each wants, what stops them, and what does not. Plus the executed failures of our previous design. |
| [security/randomness-and-verification.md](security/randomness-and-verification.md) | Where the seed comes from, why nobody can re-roll it, and how anyone recomputes a threshold after the fact. |
| [operations/keeper.md](operations/keeper.md) | The keeper's job step by step, the ordering rule, what happens when it is down, and the gas budget. |
| [operations/deploying.md](operations/deploying.md) | Deploy order, constructor parameters, verification, and the Sepolia parameter set against a mainnet one. |
| [limitations.md](limitations.md) | Every documented limitation in one numbered list. |
| [faq.md](faq.md) | Ten short answers, including where the claim button went. |

## Working files

| File | What it is |
| --- | --- |
| [PLACEHOLDERS.md](PLACEHOLDERS.md) | Every `{{TOKEN}}` used in these pages and where its value comes from after deployment. |
| [OPEN-QUESTIONS.md](OPEN-QUESTIONS.md) | Questions a judge would ask that the specification does not answer yet. |
