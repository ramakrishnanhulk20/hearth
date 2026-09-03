import type { Address } from "viem";

export const CHAIN_ID = Number(process.env.NEXT_PUBLIC_CHAIN_ID ?? 11155111);

const address = (value: string | undefined): Address | null => {
  const trimmed = (value ?? "").trim();
  return /^0x[0-9a-fA-F]{40}$/.test(trimmed) ? (trimmed as Address) : null;
};

/**
 * Only Hearth's own three contracts come from the environment. The confidential asset and its
 * underlying ERC-20 are read from the vault and the wrapper on chain, so a mismatch between what
 * the app talks to and what the vault accepts is impossible by construction.
 */
export const HEARTH = {
  vault: address(process.env.NEXT_PUBLIC_HEARTH_VAULT),
  pool: address(process.env.NEXT_PUBLIC_HEARTH_POOL),
  source: address(process.env.NEXT_PUBLIC_HEARTH_SOURCE),
} as const;

export const CONFIGURED = HEARTH.vault !== null && HEARTH.pool !== null && HEARTH.source !== null;

export const EXPLORER = "https://sepolia.etherscan.io";

export const txUrl = (hash: string) => `${EXPLORER}/tx/${hash}`;
export const addressUrl = (value: string) => `${EXPLORER}/address/${value}`;

export const TIER_NAMES = ["Grand", "Mid", "Frequent"] as const;

export const TOKEN_DECIMALS = 6;
export const TOKEN_UNIT = 1_000_000n;

/** Zama's mock USDC caps one mint at a million tokens, and the app asks for the cap. */
export const FAUCET_AMOUNT = 1_000_000n * TOKEN_UNIT;

/** The vault stops at four savers of encrypted work per call, so a larger ask silently does less. */
export const EVALUATE_BATCH = 4n;

/** Below this many savers the published bracket is close to personal information. */
export const MIN_ANONYMITY_SET = 3;
