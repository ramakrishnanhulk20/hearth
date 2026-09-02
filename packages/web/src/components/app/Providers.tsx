"use client";

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { ZamaSDK } from "@zama-fhe/sdk";
import { createConfig as createZamaConfig } from "@zama-fhe/sdk/viem";
import { sepolia as fheSepolia } from "@zama-fhe/sdk/chains";
import { web } from "@zama-fhe/sdk/web";
import { createContext, useContext, useMemo, useState } from "react";
import { WagmiProvider, usePublicClient, useWalletClient } from "wagmi";
import { wagmiConfig } from "@/lib/chain/wagmi";

const ZamaContext = createContext<ZamaSDK | null>(null);

export function Providers({ children }: { children: React.ReactNode }) {
  const [queryClient] = useState(() => new QueryClient());
  return (
    <WagmiProvider config={wagmiConfig}>
      <QueryClientProvider client={queryClient}>
        <ZamaBridge>{children}</ZamaBridge>
      </QueryClientProvider>
    </WagmiProvider>
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

        publicClient: publicClient as any,

        walletClient: walletClient as any,

        relayers: { [fheSepolia.id]: web({ timeout: 60_000 }) },
      }),
    );
  }, [publicClient, walletClient]);

  return <ZamaContext.Provider value={sdk}>{children}</ZamaContext.Provider>;
}

export function useZamaSDK(): ZamaSDK | null {
  return useContext(ZamaContext);
}

export function useZamaReady(): boolean {
  return useContext(ZamaContext) !== null;
}

