# Vercel settings

Everything a judge sees is served by one Vercel project. The documentation is built into
the same Next.js app rather than being a second site, so there is nothing else to deploy
and no second URL to keep in sync.

Ram does the clicking. This page is the exact list of what to click and what to paste.

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

Set each of these for Production, Preview and Development. The five names below are exactly
the keys in `packages/web/.env.local` today, plus one the code reads and the file does not
define.

| Variable | Public in the browser | Where its value comes from |
| --- | --- | --- |
| `SEPOLIA_RPC_URL` | No | Your own Sepolia endpoint, from Alchemy, Infura or another provider. The hero reads chain state on the server and ships the numbers inside the HTML, so this endpoint never reaches a browser and cannot be lifted out of the bundle. If it is unset the app falls back to a shared public node, which is fine for a demo and slow under load |
| `NEXT_PUBLIC_CHAIN_ID` | Yes | `11155111` for Ethereum Sepolia. The app defaults to it if unset |
| `NEXT_PUBLIC_LANTERN_POOL` | Yes | The deployed pool address, from the deploy script output. See the rename note below |
| `NEXT_PUBLIC_CONFIDENTIAL_USDC` | Yes | Zama's confidential USDC on Sepolia: `0x7c5BF43B851c1dff1a4feE8dB225b87f2C223639`. Published in Zama's own address reference, not ours to choose |
| `NEXT_PUBLIC_TEST_USDC` | Yes | Zama's mock USDC on Sepolia: `0x9b5Cd13b8eFbB58Dc25A05CF411D8056058aDFfF`. This is the token the app's "Get test USDC" button mints from |
| `NEXT_PUBLIC_SEPOLIA_RPC_URL` | Yes | Optional. The wallet connection uses it, and falls back to the same shared public node when it is unset. Anything set here is visible in the browser bundle, so it must be an endpoint you are happy to publish, never the private one above |

Anything prefixed `NEXT_PUBLIC_` is compiled into the browser bundle and is readable by
anybody who opens the page. Nothing secret belongs behind that prefix. No private key, no
seed phrase and no relayer credential is read by the app at all: the deployer's key and the
keeper's key live on Ram's machine and on the keeper host, never on Vercel.

### The rename note

`NEXT_PUBLIC_LANTERN_POOL` still carries the project's previous name and still points at a
single pool contract. Hearth has three: the vault, the prize pool and the yield source. The
app rewire is milestone 6 in `PLAN.md` and it will replace that one variable with the
addresses the new contracts need. Set the current name now if you are deploying before the
rewire lands, and re-read this page afterwards, because the variable list is the one thing
here that is going to change.

---

## After the first deploy

1. Copy the production URL. It is `{{APP_URL}}` everywhere in the README, the docs and the
   submission form.
2. Open it on a phone. Every page has to work at 375 pixels wide.
3. Connect a wallet on Sepolia and walk the two-minute judge path from the README, on the
   deployed site rather than on localhost. A judge will do exactly that and nothing else.
4. Check the documentation pages render on the deployed site, including the Mermaid
   diagrams, which are the part most likely to break in a production build.
5. Give the project a custom domain only if you already own one. A `vercel.app` URL is
   fine and the submission form accepts it.
