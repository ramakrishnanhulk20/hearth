export const CHAIN_ID = Number(process.env.NEXT_PUBLIC_CHAIN_ID ?? 11155111);

export const EXPLORER = "https://sepolia.etherscan.io";

export const txUrl = (hash: string) => `${EXPLORER}/tx/${hash}`;
export const addressUrl = (value: string) => `${EXPLORER}/address/${value}`;

/** Zama's own list of the confidential tokens it publishes on Sepolia, addresses included. */
export const ZAMA_TOKEN_LIST = "https://docs.zama.ai/protocol/protocol/deployments/sepolia";

/**
 * The three prize tiers, in the order the contracts index them.
 *
 * These are keys into the `dashboard.tiers` namespace rather than the words themselves, because
 * the tier a saver reads about on the dashboard, in a draw card and on the verify page has to be
 * the same word in whichever language they are reading, and only one of those three screens would
 * ever remember to translate a constant of its own.
 */
export const TIER_KEYS = ["grand", "mid", "frequent"] as const;

export type TierKey = (typeof TIER_KEYS)[number];

/** The vault stops at four savers of encrypted work per call, so a larger ask silently does less. */
export const EVALUATE_BATCH = 4n;

/** Below this many savers the published bracket is close to personal information. */
export const MIN_ANONYMITY_SET = 3;
