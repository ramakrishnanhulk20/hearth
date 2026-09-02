# Placeholders

Every token written as a doubled-brace name in these pages, what it should become, and
where the value comes from. Nothing in the docs should ship with one of these still in
it.

To find any that are left:

```
grep -rno '{{[A-Z_0-9]*}}' docs
```

## Addresses and deployment

| Token | Value | Source |
| --- | --- | --- |
| `{{ADDRESS_VAULT}}` | HearthVault on Sepolia | Deploy script output |
| `{{ADDRESS_POOL}}` | HearthPrizePool on Sepolia | Deploy script output |
| `{{ADDRESS_SOURCE}}` | SponsoredYieldSource on Sepolia | Deploy script output |
| `{{DEPLOY_BLOCK}}` | Block number of the vault deployment | Deploy receipt |
| `{{FIRST_PERIOD_AT}}` | The `firstPeriodAt` immutable, as a unix timestamp and a readable date | Constructor argument |
| `{{APP_URL}}` | The live app URL judges connect a wallet to | Vercel deployment |
| `{{CHAINLINK_UPKEEP_ID}}` | The registered time-based upkeep id, or "not registered" | Chainlink Automation |

Zama's own Sepolia addresses are written literally, not as placeholders, because they are
published in Zama's address reference and are not ours to choose: mock USDC
`0x9b5Cd13b8eFbB58Dc25A05CF411D8056058aDFfF` and confidential USDC
`0x7c5BF43B851c1dff1a4feE8dB225b87f2C223639`.

## Measured limits and costs

| Token | Value | Source |
| --- | --- | --- |
| `{{MAX_BATCH}}` | Savers needing encrypted work per `evaluate` call | The constant compiled into the vault. `DECISIONS.md` records 4, measured against the mock's price table with the Sepolia tier set. Confirm on the live coprocessor before the docs ship, because the figure moves with the tier set and with any Zama repricing. |
| `{{HCU_EVALUATE}}` | Compute units to evaluate one saver | Measured on the live coprocessor, not the price table |
| `{{GAS_EVALUATE}}` | Gas to evaluate one saver | Live Sepolia receipt |
| `{{GAS_EVALUATE_BATCH}}` | Gas for a full batch of `{{MAX_BATCH}}` savers | Live Sepolia receipt |
| `{{GAS_CLOSE}}` | Gas for `closeDraw`, including the five bracket comparisons | Live Sepolia receipt |
| `{{GAS_AWARD}}` | Gas for `awardDraw` with the four-handle proof | Live Sepolia receipt |
| `{{GAS_FINALIZE}}` | Gas for `finalizeDraw` | Live Sepolia receipt |
| `{{GAS_RECONCILE}}` | Gas for `reconcile`, per tier | Live Sepolia receipt |
| `{{GAS_PER_DRAW}}` | Total gas for one full draw at `{{SAVER_COUNT_EXAMPLE}}` savers | Sum of the above, with three reconciles, since every tier is due every draw. |
| `{{SAVER_COUNT_EXAMPLE}}` | The saver count the budget line is quoted at | Choose the seeded demo pool size |
| `{{GAS_PRICE_ASSUMPTION}}` | The gas price the ETH figures assume, in gwei | State it, do not hide it |
| `{{ETH_PER_DRAW}}` | ETH per draw at that gas price | Derived |
| `{{ETH_PER_DAY}}` | ETH per day at a one-hour period | Derived, 24 draws |
| `{{ETH_PER_DAY_MAINNET}}` | ETH per day at a daily period | Derived, 1 draw |

## Yield and tiers

| Token | Value | Source |
| --- | --- | --- |
| `{{SPONSOR_RATE}}` | `ratePerSecond` on the live source, plus the same figure as USDC per period so a reader can use it | Constructor argument or `RateChanged` |
| `{{MAINNET_GRAND_ODDS}}` | Candidate grand-tier odds at a daily period | Design choice, not deployed |
| `{{MAINNET_GRAND_SHARES}}` | Candidate grand-tier shares | Design choice, not deployed |
| `{{MAINNET_GRAND_RECONCILE}}` | Candidate grand-tier reconcile cadence, in draws | Design choice, not deployed. A span over which nearly every saver was eligible at least once hides the count, at the cost of the pot only becoming visible on the reconcile draw. Sepolia runs 1. |
| `{{MAINNET_MID_ODDS}}` | Candidate mid-tier odds | Design choice, not deployed |
| `{{MAINNET_MID_SHARES}}` | Candidate mid-tier shares | Design choice, not deployed |
| `{{MAINNET_MID_RECONCILE}}` | Candidate mid-tier reconcile cadence, in draws | Design choice, not deployed |
| `{{MAINNET_FREQUENT_SHARES}}` | Candidate frequent-tier shares | Design choice, not deployed |

## The worked verification example

These six come from one real Sepolia draw, chosen after deployment. Pick a draw that
actually paid at least one prize, so the example is not degenerate. The prize count is
only public once the tier in question has reconciled, which on this deployment is the draw
after the one being quoted.

| Token | Value |
| --- | --- |
| `{{DRAW_ID_EXAMPLE}}` | The draw number |
| `{{SEED_EXAMPLE}}` | The published seed `R` |
| `{{BRACKET_EXAMPLE}}` | The published bracket `M`, a power of two, in USDC-seconds |
| `{{HARVEST_EXAMPLE}}` | The verified harvest for that draw |
| `{{PRIZES_EXAMPLE}}` | Prize size per tier, as three numbers |
| `{{PAID_EXAMPLE}}` | Prizes paid per tier, as three numbers, from the reconciled carries |

## Other

| Token | Value | Source |
| --- | --- | --- |
| `{{FAUCET_SEPOLIA_ETH}}` | The Sepolia ETH faucets we actually tested, as links | Test them before listing them |
| `{{ATTACK_LOG_DIR}}` | Where the executed attack outputs are committed | Self-audit run |

## Retired

| Token | Why it is gone |
| --- | --- |
| `{{AGGREGATE_EXAMPLE}}` | The pool's exact total weight is no longer published. Replaced by `{{BRACKET_EXAMPLE}}`. |

## Added by the README draft

| Token | Meaning | Source of the value |
| --- | --- | --- |
| `{{REPO_URL}}` | The public GitHub repository | Ram, at push time |
| `{{DOCS_URL}}` | The docs route of the live app | The app deployment |
| `{{VIDEO_URL}}` | The demo video, hosted on X, YouTube or Loom | Ram, after recording |
| `{{X_POST_URL}}` | The X post or thread announcing the project | Ram, after posting |
| `{{TEST_OUTPUT}}` | The pasted output of `npm test` in the contracts package | The final suite run |
| `{{PROVE_OUTPUT}}` | The pasted output of the prove-it command on Sepolia | The live run |
| `{{GAS_DEPOSIT}}` | Gas of one deposit through the receive hook on Sepolia | A live receipt |
| `{{GAS_WITHDRAW}}` | Gas of one `withdrawAll` on Sepolia | A live receipt |
