import { createConfig, http } from "wagmi";
import { sepolia } from "wagmi/chains";
import { injected, walletConnect } from "wagmi/connectors";

const RPC_URL = process.env.NEXT_PUBLIC_SEPOLIA_RPC_URL || "https://ethereum-sepolia-rpc.publicnode.com";

/**
 * WalletConnect needs a project id from Reown's dashboard, and there is no sensible default for
 * one. Without it the connector would build fine and then fail at the moment somebody scanned the
 * code, so it is left out entirely and the screens say so instead.
 */
const WALLETCONNECT_PROJECT_ID = process.env.NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID ?? "";

export const hasWalletConnect = WALLETCONNECT_PROJECT_ID !== "";

/** Where a visitor with no browser wallet at all is sent. Named once, used by every empty state. */
export const WALLET_DOWNLOAD_URL = "https://ethereum.org/en/wallets/find-wallet/";

export const wagmiConfig = createConfig({
  chains: [sepolia],
  // The injected connector is the extension already in the browser. WalletConnect is the way in
  // from a phone, and from a desktop with no extension, which is the only path a judge on an
  // unfamiliar machine has.
  connectors: hasWalletConnect
    ? [
        injected(),
        walletConnect({
          projectId: WALLETCONNECT_PROJECT_ID,
          showQrModal: true,
          metadata: {
            name: "Hearth",
            description: "Confidential no-loss prize savings on the Zama Protocol",
            url: "https://hearth.vercel.app",
            icons: ["https://hearth.vercel.app/icon.svg"],
          },
        }),
      ]
    : [injected()],
  transports: {
    [sepolia.id]: http(RPC_URL, { batch: true }),
  },
  // Every page that reads the chain is a client component behind Providers, so there is no server
  // render to hydrate against and no cookie to carry state in.
  ssr: false,
});

declare module "wagmi" {
  interface Register {
    config: typeof wagmiConfig;
  }
}
