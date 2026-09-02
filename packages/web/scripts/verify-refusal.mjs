// Confirms the classification the hero uses is the one the protocol actually produces.
import { ZamaSDK } from "@zama-fhe/sdk";
import { createConfig } from "@zama-fhe/sdk/viem";
import { sepolia as fheSepolia } from "@zama-fhe/sdk/chains";
import { node } from "@zama-fhe/sdk/node";
import { createPublicClient, createWalletClient, http } from "viem";
import { sepolia } from "viem/chains";

const transport = http();
const sdk = new ZamaSDK(createConfig({
  chains: [fheSepolia],
  publicClient: createPublicClient({ chain: sepolia, transport }),
  walletClient: createWalletClient({ chain: sepolia, transport }),
  relayers: { [fheSepolia.id]: node({ timeout: 30000 }) },
}));

const HANDLE = process.argv[2];
try {
  const r = await sdk.decryption.decryptPublicValues([HANDLE]);
  console.log("verdict: DECRYPTED", JSON.stringify(r.clearValues));
} catch (error) {
  const detail = error?.cause?.message ?? error?.message ?? String(error);
  const refused = /not allowed for (public )?decryption|unauthori|not entitled|acl/i.test(detail);
  console.log("cause  :", detail.split("\n")[0]);
  console.log("verdict:", refused ? "REFUSED (hero shows the refusal)" : "UNREACHABLE (hero shows a service problem)");
}
