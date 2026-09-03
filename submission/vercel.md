# Vercel settings

Everything a judge sees is served by one Vercel project. The documentation is built into
the same Next.js app rather than being a second site, so there is nothing else to deploy
and no second URL to keep in sync.

Ram does the clicking. This page is the exact list of what to click and what to paste.

The app runs Next 16 with Turbopack, React 19.2, wagmi 3 and viem 2.56. `npm audit
--omit=dev` at the repository root reports no findings; everything `npm audit` still lists
is in the Hardhat toolchain, which is a dev dependency of the contracts package and is
never built or shipped.

---

## Project settings

| Setting | Value | Why |
| --- | --- | --- |
| Framework preset | Next.js | Vercel detects it from `packages/web/package.json` |
| Root Directory | `packages/web` | The app lives in an npm workspace, not at the repo root |
| Include source files outside of the Root Directory | On | The workspace's dependencies are hoisted to the repo root, so the build needs the root `package.json` and `package-lock.json` |
| Install Command | leave as the default (`npm install`) | Runs at the repository root and installs the whole workspace |
| Build Command | leave as the default (`next build`) | With the Root Directory set, Vercel runs it inside `packages/web` |
| Output Directory | leave as the default (`.next`) | See the warning below |
| Node.js version | 20.x | The root `package.json` sets `engines.node` to 20 or newer |

**Do not set `NEXT_DIST_DIR` in the Vercel environment.** `packages/web/next.config.ts`
reads it and moves the build output when it is present. It exists so a local verification
build does not fight the dev server for the same `.next` directory. On Vercel it would move
the output away from where Vercel looks for it, and the deploy would fail with nothing
obvious to point at.

---

## Environment variables

Set each of these for Production, Preview and Development. The six names below are exactly
the keys the app reads, and `packages/web/.env.example` is the same list with comments.

| Variable | Public in the browser | Where its value comes from |
| --- | --- | --- |
| `SEPOLIA_RPC_URL` | No | Your own Sepolia endpoint, from Alchemy, Infura or another provider. The landing page and the `/api/activity` route read the chain on the server and ship the numbers inside the HTML, so this endpoint never reaches a browser and cannot be lifted out of the bundle. It also has to answer `eth_getLogs` over a few thousand blocks, which the free public node refuses. If it is unset the app falls back to that public node and the draw history goes quiet |
| `NEXT_PUBLIC_SEPOLIA_RPC_URL` | Yes | Optional. The wallet reads use it, and fall back to `https://ethereum-sepolia-rpc.publicnode.com` when it is unset. Anything set here is visible in the browser bundle, so it must be an endpoint you are happy to publish, never the private one above |
| `NEXT_PUBLIC_CHAIN_ID` | Yes | `11155111` for Ethereum Sepolia. The app defaults to it if unset |
| `NEXT_PUBLIC_HEARTH_VAULT` | Yes | `0x0F93e5db6027b4FB1C76566d24aA2D2E417fAF52`, from `packages/contracts/deployments/sepolia/hearth.json` |
| `NEXT_PUBLIC_HEARTH_POOL` | Yes | `0xA0785AacF30B6FE46EDc53CD8A9db1d94FeF5Df2`, same file |
| `NEXT_PUBLIC_HEARTH_SOURCE` | Yes | `0xCC49DF69eAB6884fD8DD9260902B8A0Abc9D6b91`, same file |

The confidential asset and its underlying ERC-20 are deliberately **not** environment
variables any more. The app reads `vault.asset()` and then `asset.underlying()` on chain, so
it can never be pointed at a token the vault would refuse. The old
`NEXT_PUBLIC_LANTERN_POOL`, `NEXT_PUBLIC_CONFIDENTIAL_USDC` and `NEXT_PUBLIC_TEST_USDC` are
gone; delete them from the Vercel project if they are already set.

Anything prefixed `NEXT_PUBLIC_` is compiled into the browser bundle and is readable by
anybody who opens the page. Nothing secret belongs behind that prefix. No private key, no
seed phrase and no relayer credential is read by the app at all: the deployer's key and the
keeper's key live on Ram's machine and on the keeper host, never on Vercel.

---

## After the first deploy

1. Copy the production URL. It is `{{APP_URL}}` everywhere in the README, the docs and the
   submission form.
2. Open it on a phone. Every page has to work at 375 pixels wide.
3. Connect a wallet on Sepolia and walk the two-minute judge path from the README, on the
   deployed site rather than on localhost. A judge will do exactly that and nothing else.
4. Open `/verify` and paste a saver's address. The thresholds come from a contract call, so
   if they render, the deployed app is talking to the deployed vault.
5. Open `/lab`. It is the draw ceremony, deliberately not linked from the navigation, and it
   is the page worth screenshotting for the submission.
6. Give the project a custom domain only if you already own one. A `vercel.app` URL is
   fine and the submission form accepts it.
