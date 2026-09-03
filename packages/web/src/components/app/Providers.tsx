"use client";

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { MotionConfig } from "framer-motion";
import { ZamaSDK } from "@zama-fhe/sdk";
import { createConfig as createZamaConfig } from "@zama-fhe/sdk/viem";
import { sepolia as fheSepolia } from "@zama-fhe/sdk/chains";
import { web } from "@zama-fhe/sdk/web";
import { createContext, useContext, useEffect, useMemo, useState } from "react";
import { WagmiProvider, usePublicClient, useWalletClient } from "wagmi";
import { wagmiConfig } from "@/lib/chain/wagmi";

const ZamaContext = createContext<ZamaSDK | null>(null);
const MountedContext = createContext(false);

export function Providers({ children }: { children: React.ReactNode }) {
  const mounted = useContext(MountedContext);
  const [queryClient] = useState(() => new QueryClient());

  // The console layout mounts this once for every route under /app. A page inside it that also
  // wraps itself would otherwise stand up a second wagmi store and a second Zama SDK worker, and
  // the two would disagree about which wallet is connected.
  if (mounted) return <>{children}</>;

  return (
    <MountedContext.Provider value>
      <WagmiProvider config={wagmiConfig}>
        <QueryClientProvider client={queryClient}>
          {/* Framer Motion animates in JavaScript, so the CSS reduced-motion rule cannot reach it.
              "user" makes every motion component here honour the reader's own system setting. */}
          <MotionConfig reducedMotion="user">
            <ZamaBridge>{children}</ZamaBridge>
          </MotionConfig>
        </QueryClientProvider>
      </WagmiProvider>
    </MountedContext.Provider>
  );
}

function ZamaBridge({ children }: { children: React.ReactNode }) {
  const publicClient = usePublicClient();
  const { data: walletClient } = useWalletClient();

  const sdk = useMemo(() => {
    if (!publicClient || !walletClient) return null;
    return new ZamaSDK(
      createZamaConfig({
        chains: [fheSepolia],
        publicClient: publicClient as never,
        walletClient: walletClient as never,
        relayers: { [fheSepolia.id]: web({ timeout: 60_000 }) },
      }),
    );
  }, [publicClient, walletClient]);

  // The SDK holds a worker and a signer subscription. A wallet switch builds a new one, so the
  // old one is shut down rather than left running behind the new instance.
  useEffect(() => {
    if (!sdk) return;
    return () => sdk.dispose();
  }, [sdk]);

  return <ZamaContext.Provider value={sdk}>{children}</ZamaContext.Provider>;
}

/** The SDK bound to the connected wallet, or null until a wallet is connected. */
export function useZamaSDK(): ZamaSDK | null {
  return useContext(ZamaContext);
}
