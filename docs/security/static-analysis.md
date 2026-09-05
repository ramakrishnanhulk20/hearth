# Static analysis

Every contract is run through slither 0.11.6 and solhint before a deployment, and every finding
is either fixed or explained here. The seven pools are seven deployments of these same three
contracts, so one run covers all of them. This page is the explanation. The raw run is repeatable:

```bash
npm run lint -w @hearth/contracts
```

for solhint, which passes with zero warnings on the tuned rule set in `.solhint.json`, and for
slither a plain compile of the same sources without the FHEVM Hardhat plugin, because the plugin
rewrites `ZamaConfig.sol` at compile time and slither can then no longer map source offsets back
to the file on disk. The plain compile uses the identical compiler settings (0.8.27, optimizer at
800 runs, cancun), so the bytecode slither reads is the bytecode that ships.

## The run

slither analysed 46 contracts with 102 detectors and reported 88 results, 85 of them in Hearth's
own contracts. None is a bug. They fall into five families, and each family has one reason.

| Family | Count | Severity slither assigns | Why it is not a finding |
| --- | --- | --- | --- |
| `unused-return` | 38 | Medium | 36 of them are `FHE.allow`, `FHE.allowThis`, `FHE.allowTransient` and `FHE.makePubliclyDecryptable`, which return the handle they were given so calls can be chained. Ignoring that return is the documented usage in every Zama example. The other two are below. |
| `reentrancy-no-eth`, `reentrancy-benign`, `reentrancy-events` | 20 | Medium and Low | slither treats every `FHE.*` operation as an external call, because each one is a call into the coprocessor contract. Those calls carry ciphertext handles, not control, and no user contract runs inside them. The genuinely external calls are the token and the vault, both fixed at construction, and every function that moves value is `nonReentrant` and writes its state before the transfer. |
| `timestamp` and `incorrect-equality` | 18 | Low and Medium | Periods are defined by `block.timestamp` on purpose, and the strict equalities compare period numbers and zero flags, never balances. A validator can shift a timestamp by seconds against periods of an hour or six, which moves a saver's weight by that many seconds out of 3,600 or 21,600. |
| `uninitialized-local` | 8 | Medium | Accumulators and counters that start at Solidity's zero default by intent: `offered`, `assigned`, `totalShares`, `processed`, `heavy`, `marked`, `cleared`. `harvestHandle` is assigned on every path of the try/catch that follows its declaration. |
| `calls-loop` | 1 | Low | `finalizeDraw` asks the pool for each of three tiers' reconcile cadence. The loop is bounded at three and the pool is the vault's own, set once by the owner. |

The two `unused-return` results that are not access-control calls:

- `HearthVault._withdraw` ignores the handle `confidentialTransfer` returns. An ERC-7984 transfer
  moves the whole amount or nothing, and the vault has already clamped the amount to the smaller of
  what the saver holds and what the vault holds in the same transaction, so the transferred amount
  is the requested amount by construction. The ledger was updated before the call.
- `SponsoredYieldSource.sponsor` ignores what `wrap` returns. The sponsor is the trusted party
  here by definition, and what the pool books at a close is never the sponsor's own figure but the
  KMS-verified amount the source actually transferred at harvest.

## What slither cannot see

slither reasons about plaintext control flow. It cannot tell whether an encrypted comparison is
the right comparison, whether an access-control list grant is missing, or whether a value is
published that should not be. Those properties are covered by the unit tests, the fairness and
invariant tests, and the executed attack scripts in [the threat model](threat-model.md).

## Dependency audit

`npm audit --omit=dev` at the repository root reports two findings on 6 September 2026, both in
`axios`, and both in code the app never runs:

- `axios@0.21.4` under `hardhat-deploy@0.11.45`, in the contracts package. It is deployment
  tooling that runs on the operator's machine and never ships in a bundle. `hardhat-deploy` 0.11
  pins the 0.21 line, so the only fix is a major upgrade of the deploy tool, which would change
  the deployment records this repository depends on.
- `axios` under `@coinbase/cdp-sdk`, which `@wagmi/connectors` pulls in with the WalletConnect
  connector. Hearth never imports axios and never calls Coinbase's SDK; the advisories concern
  server-side proxy handling and request forgery in Node, not a browser bundle. `npm audit fix`
  moves the nested copy to another vulnerable release rather than out of the range, so it is
  left as the lockfile records it.

The web package on its own, with the connector removed, audits clean, which is how the
3 September figure of zero findings was produced.
