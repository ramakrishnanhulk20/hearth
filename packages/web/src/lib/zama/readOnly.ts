import type { ZamaSDK } from "@zama-fhe/sdk";

/**
 * A wallet-free SDK, for the pages that only ever ask for a public decryption: the verify page
 * and the draw ceremony. It has no account, so it cannot user-decrypt anybody's handle even by
 * mistake, and it loads on demand because the FHE runtime and its keys are several megabytes.
 */
let cached: Promise<ZamaSDK> | null = null;

export function readOnlySdk(): Promise<ZamaSDK> {
  cached ??= (async () => {
    const [{ ZamaSDK }, { createConfig }, { web }, { sepolia: fheSepolia }, viem, { sepolia }] =
      await Promise.all([
        import("@zama-fhe/sdk"),
        import("@zama-fhe/sdk/viem"),
        import("@zama-fhe/sdk/web"),
        import("@zama-fhe/sdk/chains"),
        import("viem"),
        import("viem/chains"),
      ]);

    const url = process.env.NEXT_PUBLIC_SEPOLIA_RPC_URL || undefined;
    const transport = viem.http(url);
    return new ZamaSDK(
      createConfig({
        chains: [fheSepolia],
        publicClient: viem.createPublicClient({ chain: sepolia, transport }),
        // The SDK's viem config wants a wallet client even for a public decryption. This one has
        // no account, so there is nothing it could sign a user decryption with.
        walletClient: viem.createWalletClient({ chain: sepolia, transport }),
        relayers: { [fheSepolia.id]: web({ timeout: 60_000 }) },
      }),
    );
  })();
  return cached;
}
