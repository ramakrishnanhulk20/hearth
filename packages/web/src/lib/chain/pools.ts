import type { Address } from "viem";
import data from "./pools.json";

/**
 * Every pool this app knows about, and the one token it has to refuse.
 *
 * The file beside this one is written by `node scripts/sync-pools.mjs` from the deployment files
 * the deploy script produced, so no address in the app was ever typed by hand. Nothing here comes
 * from the environment any more: a build carries the pools it was built with, and a new deploy is
 * a rerun of the script rather than a change to a hosting panel.
 */

type Shared = {
  slug: string;
  /** The token's full name, as the token itself calls it. */
  name: string;
  /** The confidential token's ticker, which is what the vault's amounts are denominated in. */
  symbol: string;
  /** The plain ERC-20 underneath it, which is what a wallet holds before shielding. */
  underlyingSymbol: string;
};

export type OpenPool = Shared & {
  status: "open";
  /**
   * The confidential token's decimals. Every vault figure, prize and credit is in these units.
   * The underlying's own decimals are not stored: the wrapper's rate() gives them away, and
   * reading them from the chain beats trusting a second copy in a file.
   */
  decimals: number;
  vault: Address;
  pool: Address;
  source: Address;
  asset: Address;
  underlying: Address;
  firstPeriodAt: number;
  periodLength: number;
};

export type RestrictedPool = Shared & {
  status: "restricted";
  asset: Address;
  underlying: Address;
  /** Said in the product's own words on screen, so it never reads as a bug in Hearth. */
  reason: string;
};

export type Pool = OpenPool | RestrictedPool;

export const POOLS = data.pools as Pool[];

export const OPEN_POOLS = POOLS.filter((pool): pool is OpenPool => pool.status === "open");

/** The pool a visitor with no cookie and no slug lands on. */
export const DEFAULT_POOL = "usdc";

/** Remembers the last pool a saver picked, so /app opens where they left off. */
export const POOL_COOKIE = "hearth.pool";

export function findPool(slug: string | undefined | null): Pool | null {
  if (!slug) return null;
  return POOLS.find((pool) => pool.slug === slug) ?? null;
}

/**
 * The pool to show when the URL did not name one: what the saver last picked, else the default,
 * else whatever is deployed. The last fallback matters on a deployment that never included usdc.
 */
export function resolvePoolSlug(preferred: string | undefined | null): string {
  if (findPool(preferred)) return preferred as string;
  if (findPool(DEFAULT_POOL)) return DEFAULT_POOL;
  return POOLS[0]?.slug ?? DEFAULT_POOL;
}

/**
 * How the underlying is priced against the confidential token: rate is underlying units per
 * confidential unit, and both sides of every wrapper we use are powers of ten. Anything else
 * falls back to the confidential decimals, which is a wrong scale rather than a crash, and only
 * a wrapper we did not deploy could produce it.
 */
export function underlyingDecimals(decimals: number, rate: bigint): number {
  if (rate <= 0n) return decimals;
  let extra = 0;
  let left = rate;
  while (left % 10n === 0n) {
    left /= 10n;
    extra += 1;
  }
  return left === 1n ? decimals + extra : decimals;
}

/** The mock underlyings cap one mint at a million whole tokens, and the faucet asks for the cap. */
export function faucetAmount(decimals: number, rate: bigint): bigint {
  return 1_000_000n * 10n ** BigInt(underlyingDecimals(decimals, rate));
}
