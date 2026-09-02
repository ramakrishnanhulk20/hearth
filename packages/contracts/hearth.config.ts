/**
 * Deployment parameters per network. The deploy script and every hearth:* task read this file, so a
 * reviewer can compare the verified constructor arguments against one page of numbers.
 */

/** Base units of the asset. Both USDC deployments Hearth runs against have six decimals. */
export const usdc = (whole: number): bigint => BigInt(whole) * 1_000_000n;

export type HearthTier = {
  readonly prizeCount: number;
  readonly oddsNumerator: number;
  readonly oddsDenominator: number;
  readonly shares: number;
  readonly reconcileEvery: number;
};

/**
 * How the deploy script picks `firstPeriodAt`, which is immutable and must be at or before the
 * deployment block. Both rules read the chain's own clock, never the machine's.
 */
export type FirstPeriodRule = "top-of-hour" | "latest-block";

export type HearthNetwork = {
  /** The confidential ERC-7984 asset. Absent means the deploy script deploys a local token pair. */
  readonly asset?: string;
  /** The public ERC-20 the asset wraps, used by the seed and prove tasks to obtain test money. */
  readonly underlying?: string;
  readonly periodLength: bigint;
  readonly firstPeriodAt: FirstPeriodRule;
  readonly tiers: readonly [HearthTier, HearthTier, HearthTier];
  readonly initialScaleBits: number;
  /** Release rate of the sponsored yield source, in asset base units per second. */
  readonly sponsorRatePerSecond: bigint;
  /** What `hearth:seed` sponsors, in asset base units. */
  readonly initialSponsorship: bigint;
};

/**
 * Grand pays about once a day at an hourly period, mid about every six hours, frequent four prizes
 * every draw. Every tier reconciles every draw, so what a tier offered and nobody won returns to its
 * public pot one draw later and the jackpot accumulates in the open, the way PoolTogether's does.
 * Raising `reconcileEvery` hides how many prizes a tier paid for that many draws, but the money
 * nobody won then sits in the encrypted carry and the public prize size falls to one draw's share
 * until the next reconcile. That trade is the deployment's to make; this one keeps the jackpot
 * visible and hides balances, weights, results and the winner.
 */
const TIERS: readonly [HearthTier, HearthTier, HearthTier] = [
  { prizeCount: 1, oddsNumerator: 1, oddsDenominator: 24, shares: 40, reconcileEvery: 1 },
  { prizeCount: 1, oddsNumerator: 1, oddsDenominator: 6, shares: 20, reconcileEvery: 1 },
  { prizeCount: 4, oddsNumerator: 1, oddsDenominator: 1, shares: 40, reconcileEvery: 1 },
];

export const NETWORKS: Record<string, HearthNetwork> = {
  sepolia: {
    // Zama's own staging pair: cUSDCMock wrapping USDCMock, whose mint is public up to a million
    // tokens a call. Both are read from the Zama Sepolia address book, not deployed by us.
    asset: "0x7c5BF43B851c1dff1a4feE8dB225b87f2C223639",
    underlying: "0x9b5Cd13b8eFbB58Dc25A05CF411D8056058aDFfF",
    periodLength: 3_600n,
    firstPeriodAt: "top-of-hour",
    tiers: TIERS,
    // The seeded pool holds 2,325 USDC, which is 2.325e9 base units, held for a 3,600 second
    // period: an aggregate weight near 8.4e12 balance-seconds. That sits between 2^42 (4.4e12)
    // and 2^43 (8.8e12), so 43 is the bit length of the smallest power of two at or above it.
    initialScaleBits: 43,
    // 20 USDC an hour, so 20,000,000 base units over 3,600 seconds, rounded down.
    sponsorRatePerSecond: usdc(20) / 3_600n,
    // At 20 USDC an hour this is about 20 days of prizes, which covers the judging window without
    // anyone topping the pool up. One call to the mock token's public mint covers it, since that
    // mint is capped at a million tokens a call.
    initialSponsorship: usdc(10_000),
  },
  hardhat: {
    periodLength: 600n,
    firstPeriodAt: "latest-block",
    tiers: TIERS,
    // The same 2.325e9 base units over a 600 second period is near 1.4e12, just above 2^40. The
    // guess is deliberately one bit low so a local run shows the tracker correcting itself.
    initialScaleBits: 40,
    sponsorRatePerSecond: usdc(1),
    initialSponsorship: usdc(10_000),
  },
  localhost: {
    periodLength: 600n,
    firstPeriodAt: "latest-block",
    tiers: TIERS,
    initialScaleBits: 40,
    sponsorRatePerSecond: usdc(1),
    initialSponsorship: usdc(10_000),
  },
};

export function networkConfig(name: string): HearthNetwork {
  const config = NETWORKS[name];
  if (!config) {
    throw new Error(
      `Hearth has no configuration for network "${name}". Add one to packages/contracts/hearth.config.ts.`,
    );
  }
  return config;
}

/** True when the network runs against a token pair somebody else deployed. */
export function hasCanonicalAsset(config: HearthNetwork): boolean {
  return config.asset !== undefined && config.underlying !== undefined;
}
