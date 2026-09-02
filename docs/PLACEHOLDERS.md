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
| `{{MAX_BATCH}}` | Savers per `evaluate` call | The constant compiled into the vault, chosen from the measured per-saver cost with headroom |
| `{{HCU_EVALUATE}}` | Compute units to evaluate one saver | Measured on the live coprocessor, not the price table |
| `{{GAS_EVALUATE}}` | Gas to evaluate one saver | Live Sepolia receipt |
| `{{GAS_EVALUATE_BATCH}}` | Gas for a full batch of `{{MAX_BATCH}}` savers | Live Sepolia receipt |
| `{{GAS_CLOSE}}` | Gas for `closeDraw` | Live Sepolia receipt |
| `{{GAS_AWARD}}` | Gas for `awardDraw` | Live Sepolia receipt |
| `{{GAS_FINALIZE}}` | Gas for `finalizeDraw` | Live Sepolia receipt |
| `{{GAS_RECONCILE}}` | Gas for `reconcile` | Live Sepolia receipt |
| `{{GAS_PER_DRAW}}` | Total gas for one full draw at `{{SAVER_COUNT_EXAMPLE}}` savers | Sum of the above |
| `{{SAVER_COUNT_EXAMPLE}}` | The saver count the budget line is quoted at | Choose the seeded demo pool size |
| `{{GAS_PRICE_ASSUMPTION}}` | The gas price the ETH figures assume, in gwei | State it, do not hide it |
| `{{ETH_PER_DRAW}}` | ETH per draw at that gas price | Derived |
| `{{ETH_PER_DAY}}` | ETH per day at a 30-minute period | Derived, 48 draws |
| `{{ETH_PER_DAY_MAINNET}}` | ETH per day at a daily period | Derived, 1 draw |

## Yield and tiers

| Token | Value | Source |
| --- | --- | --- |
| `{{SPONSOR_RATE}}` | `ratePerSecond` on the live source, plus the same figure as USDC per period so a reader can use it | Constructor argument or `RateChanged` |
| `{{MAINNET_GRAND_ODDS}}` | Candidate grand-tier odds at a daily period | Design choice, not deployed |
| `{{MAINNET_GRAND_SHARES}}` | Candidate grand-tier shares | Design choice, not deployed |
| `{{MAINNET_MID_ODDS}}` | Candidate mid-tier odds | Design choice, not deployed |
| `{{MAINNET_MID_SHARES}}` | Candidate mid-tier shares | Design choice, not deployed |
| `{{MAINNET_FREQUENT_SHARES}}` | Candidate frequent-tier shares | Design choice, not deployed |

## The worked verification example

These five come from one real Sepolia draw, chosen after deployment. Pick a draw that
actually paid at least one prize, so the example is not degenerate.

| Token | Value |
| --- | --- |
| `{{DRAW_ID_EXAMPLE}}` | The draw number |
| `{{SEED_EXAMPLE}}` | The published seed `R` |
| `{{AGGREGATE_EXAMPLE}}` | The published total weight `W`, in USDC-seconds |
| `{{HARVEST_EXAMPLE}}` | The verified harvest for that draw |
| `{{PRIZES_EXAMPLE}}` | Prize size per tier, as three numbers |
| `{{PAID_EXAMPLE}}` | Prizes paid per tier, as three numbers, from the reconciled remainders |

## Other

| Token | Value | Source |
| --- | --- | --- |
| `{{FAUCET_SEPOLIA_ETH}}` | The Sepolia ETH faucets we actually tested, as links | Test them before listing them |
| `{{ATTACK_LOG_DIR}}` | Where the executed attack outputs are committed | Self-audit run |
