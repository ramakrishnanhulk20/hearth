# @hearth/keeper

The script that keeps Hearth's draws moving. Every step it performs is permissionless, so this
keeper is a convenience, not a privileged operator: if it stops, any saver can drive the same
draw forward from the app, and a Chainlink time-based upkeep covers the one step that needs no
off-chain data. Nothing here can take money, change a prize, or decide a winner. Winners are
fixed the moment `awardDraw` verifies the seed.

## What it does

Once per pass, in this order:

1. **Finalize** every draw whose two-period window has ended and that nobody has finalized. This
   folds each tier's unpaid prize money into that tier's encrypted carry and publishes the carry
   of any tier whose reconcile cadence is due. On the live deployment every tier is due every
   draw, so a finalize normally publishes all three.
2. **Reconcile** every tier the vault has published a carry for: fetch the KMS-signed cleartext
   of that carry from the Zama relayer and book it back into the tier's plaintext liquidity.
3. **Close** the draw the pool names in `closableDraw()`, while its close deadline is still ahead.
   Closing fixes the prize sizes, moves the liquidity into the draw, draws the encrypted seed and
   harvests the yield.
4. **Award** every closed draw: fetch the four cleartexts (seed, scale, non-empty flag, harvest)
   in that exact order with one proof, and send them to `awardDraw`.
5. **Evaluate** every awarded draw whose window is still open, advancing the walk in batches until
   the cursor reaches the end of the saver list.

The pass runs in two halves, and the split is after step 1. Finalizing is what publishes a tier's
carry, and `HearthVault.openDraw` leaves a carry out of the draw entirely while it is pending, so
the keeper sends its finalizes, reads the three carries again, and plans the rest of the pass from
that second read. Without the second read a carry published in this pass would wait for the next
one, which is after the close it belongs in front of, and that tier's money would sit out a whole
draw. It costs three `eth_call`s on a pass that finalizes, and nothing on a pass that does not.

The pass is idempotent. Nothing to do means one log line and a sleep. Every call is simulated
with `eth_call` before it is signed, so a race that another caller already won costs an RPC round
trip instead of gas, and the failure arrives with the contract's own error name.

## Install and build

Dependencies are hoisted to the repo root, so from the repo root:

```
npm install
npm run compile -w @hearth/contracts
npm run build -w @hearth/keeper
```

The ABIs are read from `packages/contracts/artifacts` at runtime, never hand written. At boot the
keeper checks that every function and every struct field it calls is still there and, if anything
has moved, refuses to start with the full list in one message.

## Settings

The keeper reads `packages/keeper/.env` first, then `packages/contracts/.env`, and anything
already in the environment beats both. Copy `.env.example` to `.env` and fill in the two
addresses. Everything else has a default.

| Variable | Where it usually lives | Meaning |
|---|---|---|
| `RECOVERY_PHRASE` | `packages/contracts/.env` | Your seed phrase. The keeper signs with account 2 of it (`m/44'/60'/0'/0/1`), the same account Hardhat calls `keeper`. Account 1 is the deployer and is left alone. `MNEMONIC` is read as an alias, for a machine that already sets that name. |
| `SEPOLIA_RPC_URL` | `packages/contracts/.env` | Your Sepolia endpoint. Defaults to a shared public node, which is fine for a demo and slow under load. |
| `HEARTH_VAULT` | `packages/keeper/.env` | Deployed `HearthVault`. |
| `HEARTH_POOL` | `packages/keeper/.env` | Deployed `HearthPrizePool`. |
| `HEARTH_SOURCE` | `packages/keeper/.env` | Optional. Printed at boot so you can see which yield source is wired. The keeper never calls it; the pool harvests from it. |
| `HEARTH_ADDRESSES_FILE` | | Optional JSON file with `vault`, `pool` and `source` instead of the three variables. |
| `KEEPER_POLL_SECONDS` | | Seconds between passes. Default 30. |
| `KEEPER_BATCH` | | Savers per `evaluate` call. Default 4. The vault stops at `MAX_BATCH` savers of encrypted work per call whatever you ask for, and the keeper prints both numbers at boot. |
| `KEEPER_LOOKBACK_DRAWS` | | How many past draws each pass reads. Default 4. |
| `KEEPER_SCAN_FROM` | | Pin the oldest draw watched. Default 0, meaning the current window. |
| `KEEPER_MAX_FEE_GWEI` | | Send nothing while the network's max fee is above this. Unset means no cap. |
| `KEEPER_MAX_PRIORITY_FEE_GWEI` | | Tip. Default 1 gwei when a cap is set. |
| `KEEPER_GAS_LIMIT` | | A hard gas limit per transaction. Unset lets the node estimate, which is what you want. |
| `KEEPER_CONFIRMATIONS` | | Blocks waited after each send. Default 1. |
| `KEEPER_CHAIN_ID` | | The chain the keeper expects. Default 11155111. Checked against the node's own chain id at boot, so a wrong `SEPOLIA_RPC_URL` fails at startup rather than sending to the wrong network. |
| `KEEPER_DRY_RUN` | | Same as `--dry-run`. |
| `KEEPER_RELAYER_ATTEMPTS` etc. | | Relayer patience. Default 8 tries, 3s doubling to 45s, 120s per request. |

Nothing about the phrase or the private key is ever printed. The boot line shows the keeper's
address and nothing else.

The keeper needs Sepolia ETH on its own address. It prints the balance at boot and complains
below 0.02 ETH. A ten-saver pool costs about `12,582,923` gas per draw: close `1,422,474`, award
`435,578`, two full evaluation batches at `3,417,699` and a third carrying the last two savers at
`2,000,028`, finalize `509,463`, and one reconcile per tier at `459,994`. Those are the measured
Sepolia receipts, listed step by step in [the keeper page](../../docs/operations/keeper.md).

## What a pass asks the endpoint for

Every read is its own `eth_call`. At the default `KEEPER_LOOKBACK_DRAWS` of 4 a pass makes up to
28 requests: one block read, four pool and vault reads, one `drawOf` per draw in the lookback plus
four more for each draw that is awarded, and three `publishedCarry` reads. A pass that finalizes
reads those three carries a second time, and every transaction adds its own simulation and a
confirming read, so a busy pass is above 28 and a resting one well below it. At the default 30
second poll that is roughly 56 requests a minute from the keeper alone.

They are not batched on purpose. Sending the independent reads together would not reduce the
number of requests at all, only burst them harder, which is worse against a rate limit.

Give the keeper its own endpoint rather than sharing the app's. The app polls the same contracts
from every open tab, and one shared free-tier key runs out under both. When it does the keeper
logs `tick failed while reading the chain` with the endpoint's own code, and tries again next
pass: nothing is lost, but draws land late.

## Running it

One pass and exit, which is the way to check a fresh deployment:

```
npm run once -w @hearth/keeper
```

One pass that sends nothing and prints what it would have sent:

```
npm run plan -w @hearth/keeper
```

Forever, in the foreground:

```
npm run start -w @hearth/keeper
```

Under pm2, which is how it should run for a demo, from the repo root:

```
npm run build -w @hearth/keeper
pm2 start packages/keeper/ecosystem.config.cjs
pm2 logs hearth-keeper
pm2 save
pm2 startup          # follow the command it prints, so a reboot brings the keeper back
```

On Windows, `pm2 startup` is not supported. Either install `pm2-windows-startup` (`npm install -g
pm2-windows-startup && pm2-startup install`) or add a Task Scheduler entry at logon that runs
`pm2 resurrect`. The demo keeper runs under pm2 on a Windows machine; the logon hook is a
one-time install.

Run exactly one instance. Two keepers on the same account race for the same nonce.

## Reading the log

Every line is one fact. Times are UTC.

```
09:14:02 hearth keeper: live, keeper 0x7099..., vault 0x..., pool 0x..., batch 4, poll 30s, no gas cap
09:14:03 keeper balance 0.412 ETH
09:14:04 tier reconcile cadence: grand every draw, mid every draw, frequent every draw
09:14:04 evaluating 4 savers per call, the vault allows up to 4
09:14:05 period 43, watching draws from 39 upward
09:14:07 finalized draw 39 (gas 509,463)
09:14:08 the grand tier is due, asking the relayer for its carry
09:14:16 reconciled the grand tier: 24.80 USDC back into the prize liquidity (gas 459,994)
09:14:17 the mid tier is due, asking the relayer for its carry
09:14:25 reconciled the mid tier: 4.20 USDC back into the prize liquidity (gas 459,994)
09:14:26 the frequent tier is due, asking the relayer for its carry
09:14:34 reconciled the frequent tier: 1.60 USDC back into the prize liquidity (gas 459,994)
09:14:37 closed draw 41 (gas 1,422,474)
09:14:38 draw 41 is waiting for its award: 3 tiers, prizes 12.40 / 2.10 / 0.40 USDC
09:14:39 draw 41: asking the relayer for the seed, the scale, the empty flag and the harvest
09:14:53 awarded draw 41: 3 tiers, prizes 12.40 / 2.10 / 0.40 USDC, harvest 3.60 USDC (gas 435,578)
09:15:07 evaluated draw 41: 4 of 9 savers done (gas 3,417,699)
09:15:38 nothing to do: period 43, draw 41 has 8 of 9 savers evaluated
```

What each kind of line means:

- `nothing to do` is the healthy resting state. The suffix tells you how far the current draw's
  evaluation has got.
- `closed draw N` fixed the prize sizes for that draw. Nothing after this can change what a win
  is worth.
- `draw N is waiting for its award` lists the three prize sizes, largest tier first: grand, mid,
  frequent.
- `asking the relayer` is the KMS round trip. It takes a few seconds and may say `the relayer is
  not ready yet, asking again in 3s`, which is normal for a handle published moments ago.
- `awarded draw N` means the seed and the scale are public and every saver's outcome is now fixed.
- `evaluated draw N: 4 of 9 savers done` is progress through the walk. Repeat until it reaches
  `9 of 9`.
- `finalized draw N` closed the books on that draw and published the carry of every tier due to
  reconcile, which on the live deployment is all three.
- `reconciled the X tier` turned an encrypted carry back into prize money, in time for the close
  later in the same pass.
- `draw N had no savers` or `draw N missed its window` means the money went back to the pool. No
  yield and no liquidity is lost either way.
- `gas is 41 gwei, above the 20 gwei cap, so nothing is sent this tick` means the keeper is
  waiting for a cheaper block. Nothing is stuck; the next pass tries again.
- `tick failed while reading the chain: exceeded maximum retry limit (SERVER_ERROR, 429 Too Many
  Requests)` is the endpoint, not the contracts. A tick fails while reading, before any
  transaction is built, so nothing was half sent and the next pass starts over. The part in
  brackets is the endpoint's own verdict and is how you tell a rate limit from a broken call.
- `... was refused before sending: NothingToClose` means somebody else did that step first. That
  is the system working as designed, not a fault.
- Anything on stderr is worth a look. Everything else is routine.

## Chainlink Automation as redundancy for the close step

Closing is the one step that needs no off-chain data, so it can be automated without this script.
A time-based upkeep is the simplest form and needs no contract change.

Register at https://automation.chain.link on Ethereum Sepolia:

- **Trigger**: Time-based.
- **Target contract**: the `HearthPrizePool` address. If it is not verified on Etherscan yet, the
  form asks for its ABI; paste
  `packages/contracts/artifacts/contracts/HearthPrizePool.sol/HearthPrizePool.json`.
- **Function to call**: `closeDraw()`, the no-argument overload. It closes whatever
  `closableDraw()` names, so it needs no input and cannot be aimed at the wrong draw.
- **Schedule**: `0 * * * *`, every hour on the hour, in UTC. Match this to the deployed period
  length. At a one-hour period, one close per hour is exactly one draw.
- **Gas limit**: 2,500,000 for the close itself plus about 150,000 for Chainlink's own
  `CronUpkeep` contract, so set 2,650,000. Keep it at or below 5,000,000, which satisfies both
  the documented per-network limit and the live registry's config.
- **Starting balance**: 1 LINK is plenty. The registration minimum on the Sepolia registrar is
  0.1 LINK, and each perform costs a flat 0.01 LINK on testnets plus gas converted to LINK.

Sepolia addresses, read on chain on 2 September 2026:

| What | Address |
|---|---|
| Automation registry (`KeeperRegistry 2.1.0`) | `0x86EFBD0b6736Bed994962f9797049422A3A8E8Ad` |
| Automation registrar (`AutomationRegistrar 2.1.0`) | `0xb0E49c5D0d05cbc241d68c05BC5BA1d1B7B72976` |
| LINK token | `0x779877A7B0D9E8603169DdbD7836e478b4624789` |

Testnet ETH and LINK come from https://faucets.chain.link/sepolia, which drips 25 LINK and
0.5 ETH per request.

A time-based upkeep calls through a `CronUpkeep` contract that Chainlink deploys for you, so do
not permission `closeDraw` on the forwarder address. It does not need permissioning at all:
closing is deliberately open to anyone.

The upkeep covers step 3 only. Award, evaluate, finalize and reconcile all need a KMS-signed
public decryption fetched off chain, so they stay with this script or with a saver using the app.

## What is tested

`npm test -w @hearth/keeper` builds and runs the suite with Node's own test runner. No test
touches a network, a wallet or the relayer.

- **The tick planner** against a synthetic chain state: which draws get closed, awarded,
  evaluated, finalized and reconciled, and the order the actions come out in, including the rule
  that finalize and reconcile run before the close.
- **A whole tick** driven against a stub chain that behaves like the vault: a carry that only
  becomes pending because this pass finalized is still reconciled before this pass closes the next
  draw, the carries are read a second time only when a finalize actually ran, and a close the
  endpoint refuses leaves the finalize and the reconciles sent and names the endpoint in the log.
- **The walk arithmetic**: batch sizing, the last short batch, a walk that has not started yet
  falling back to the current saver list, a cursor past the end never reporting negative work, and
  a full walk covering every saver exactly once.
- **The decryption**: the four award handles in the order the proof is bound to, cleartexts paired
  back to the handles that were asked for whatever order or case the relayer answers in, a missing
  cleartext failing loudly, the coercion of a boolean handle, something that is not a 32 byte
  handle never reaching the relayer, and the promise that two decryptions never overlap.
- **The retry policy**: which relayer failures are worth another try, `@zama-fhe/sdk`'s own verdict
  on a transient failure, a refusal by the access control list being final, a reason found inside a
  wrapped cause, the doubling wait and its ceiling, a permanent failure thrown at once without
  waiting, and giving up after the configured number of tries.
- **The boot ABI check**: a renamed function or a renamed struct field is caught at boot, with
  every mismatch listed in one message.
- **The number formatting** in the log lines, including an amount too large for a double.

Not covered: the live relayer and KMS, real gas, nonce behaviour under a reorg, and anything the
contracts do once called. Those belong to the contracts test suite and to a live run on Sepolia.

## Running it on a host instead of a laptop

The keeper is a long-running process, not a scheduled function: one pass can spend two minutes
waiting on the key management service, which is longer than most serverless platforms allow. Any
host that keeps a Node process alive will do.

The repository carries a `railway.json` at its root, so a Railway service pointed at this
repository needs no build configuration. It installs the workspace, runs
`npm run build -w @hearth/keeper`, and starts `node packages/keeper/dist/src/index.js`. On any
other host, those are the two commands.

The contract ABIs the keeper needs are committed under `packages/keeper/abi`, generated from the
compiled artifacts by `npm run abi -w @hearth/keeper`. That is what lets the keeper run somewhere
that never compiles the contracts. The boot check still compares the loaded ABI against the
functions the keeper calls, so a drift between the two is reported at startup rather than on the
first transaction.

Five variables are required:

| Variable | Value |
| --- | --- |
| `RECOVERY_PHRASE` | The twelve word phrase. The keeper signs from account index 1, which holds no owner rights over the contracts |
| `SEPOLIA_RPC_URL` | Your own endpoint. A pass makes up to 28 requests, so give the keeper one that is not shared with the app |
| `HEARTH_VAULT` | The deployed vault |
| `HEARTH_POOL` | The deployed prize pool |
| `HEARTH_SOURCE` | The deployed yield source |

Everything else has a default that suits an hourly period. `KEEPER_POLL_SECONDS` is 30,
`KEEPER_BATCH` is 4, and `KEEPER_MAX_FEE_GWEI` is unset, which means no ceiling.

Run exactly one instance. Two keepers signing from the same account race for the same nonce, so
stop the local one before starting a hosted one.
