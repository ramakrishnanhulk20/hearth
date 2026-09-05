/**
 * Deployment parameters per network, and per pool inside a network. The deploy script and every
 * hearth:* task read this file, so a reviewer can compare the verified constructor arguments
 * against one page of numbers.
 *
 * Hearth runs one independent pool per confidential token: its own vault, prize pool, yield source
 * and keeper account. The pools share nothing on chain, so a stuck keeper or a paused vault on one
 * token cannot touch another.
 */

/**
 * Base units of an amount written in whole tokens. Fractions are allowed, so 0.075 WETH is a
 * number rather than a hand-counted string of zeros. The conversion goes through a fixed-point
 * string because binary floating point cannot hold 0.1 exactly.
 */
export function units(whole: number, decimals: number): bigint {
  const [left, right = ""] = whole.toFixed(decimals).split(".");
  return BigInt(`${left}${right.padEnd(decimals, "0")}`);
}

/**
 * Every confidential wrapper on Zama's Sepolia address book holds six decimals, whatever the token
 * underneath holds, because the wrapper caps itself at six and charges the difference to its
 * `rate()`. Every amount in this file is in wrapper base units, and the tasks multiply by the
 * rate they read on chain when they touch the public token.
 */
export const WRAPPER_DECIMALS = 6;

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

export type HearthPool = {
  /** The name a task takes on --token and the suffix every deployment record carries. */
  readonly slug: string;
  /**
   * The short name printed next to an amount. Kept separate from the symbols on chain, which read
   * `cUSDCMock` and `USDCMock` and would make a status line harder to read, not easier. The chain's
   * own symbols are recorded in the address file the deploy writes.
   */
  readonly unit: string;
  /** The name Zama's address book gives the wrapper, which is the name a saver sees in the app. */
  readonly displayName: string;
  /** The confidential ERC-7984 asset. Absent means the deploy script deploys a local token pair. */
  readonly asset?: string;
  /** The public ERC-20 the asset wraps, used by the seed and prove tasks to obtain test money. */
  readonly underlying?: string;
  /** What the wrapper's own `decimals()` must read. A pool refuses to seed if the chain disagrees. */
  readonly decimals: number;
  readonly periodLength: bigint;
  readonly firstPeriodAt: FirstPeriodRule;
  readonly tiers: readonly [HearthTier, HearthTier, HearthTier];
  readonly initialScaleBits: number;
  /** Release rate of the sponsored yield source, in wrapper base units per second. */
  readonly sponsorRatePerSecond: bigint;
  /** What `hearth:seed` sponsors, in wrapper base units. */
  readonly initialSponsorship: bigint;
  /** What each of the five demo savers deposits, largest first, in wrapper base units. */
  readonly seedStakes: readonly bigint[];
  /** What `hearth:prove` deposits and withdraws again, in wrapper base units. */
  readonly proveStake: bigint;
  /** The account index that closes, awards and evaluates this pool's draws, and nothing else. */
  readonly keeperAccountIndex: number;
};

export type HearthNetwork = {
  readonly defaultToken: string;
  readonly tokens: Readonly<Record<string, HearthPool>>;
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

/**
 * The tier table of a six-hour pool. Grand still pays about once a day and mid about twice a day,
 * because the odds are set against the longer period rather than carried over from the hourly table.
 *
 * Why six hours and not one: a keeper draw costs about 12.6 million gas, so seven hourly pools would
 * burn roughly 1.2 Sepolia ETH a day and could not be kept funded through a judging window. Six-hour
 * draws cut that six-fold, and four draws a day is still enough that a judge sees the numbers move
 * inside a single visit.
 */
const SIX_HOUR_TIERS: readonly [HearthTier, HearthTier, HearthTier] = [
  { prizeCount: 1, oddsNumerator: 1, oddsDenominator: 4, shares: 40, reconcileEvery: 1 },
  { prizeCount: 1, oddsNumerator: 1, oddsDenominator: 2, shares: 20, reconcileEvery: 1 },
  { prizeCount: 4, oddsNumerator: 1, oddsDenominator: 1, shares: 40, reconcileEvery: 1 },
];

const HOUR = 3_600n;
const SIX_HOURS = 21_600n;

type PoolNumbers = {
  readonly unit: string;
  readonly displayName: string;
  readonly asset: string;
  readonly underlying: string;
  readonly periodLength: bigint;
  readonly tiers: readonly [HearthTier, HearthTier, HearthTier];
  /** Whole tokens each of the five demo savers deposits, largest first. */
  readonly stakes: readonly [number, number, number, number, number];
  /**
   * Whole tokens the yield source releases over one hour. Always stated per hour, whatever the
   * period, so two pools on different clocks can be compared at a glance. It is stored per second
   * and rounded down, because the contract's rate is whole base units a second.
   */
  readonly perHour: number;
  readonly sponsorship: number;
  readonly proveStake: number;
  readonly scaleBits: number;
  readonly keeperAccountIndex: number;
};

/**
 * One Sepolia pool. `scaleBits` is the exponent of the smallest power of two at or above the seeded
 * pool's aggregate weight, which is the five stakes added up, in base units, held for a whole
 * period. The tracker corrects itself from there within three bits a draw, so the guess only decides
 * how the first few draws look.
 */
function sepoliaPool(slug: string, numbers: PoolNumbers): HearthPool {
  const decimals = WRAPPER_DECIMALS;
  return {
    slug,
    unit: numbers.unit,
    displayName: numbers.displayName,
    asset: numbers.asset,
    underlying: numbers.underlying,
    decimals,
    periodLength: numbers.periodLength,
    firstPeriodAt: "top-of-hour",
    tiers: numbers.tiers,
    initialScaleBits: numbers.scaleBits,
    sponsorRatePerSecond: units(numbers.perHour, decimals) / HOUR,
    initialSponsorship: units(numbers.sponsorship, decimals),
    seedStakes: numbers.stakes.map((stake) => units(stake, decimals)),
    proveStake: units(numbers.proveStake, decimals),
    keeperAccountIndex: numbers.keeperAccountIndex,
  };
}

/**
 * Zama's own staging pairs, read from the Sepolia address book rather than deployed by us. Every
 * public token underneath has a mint anyone may call, capped at a million tokens a call, which is
 * what lets the seed task fund five savers and a sponsor without a faucet.
 *
 * The stakes differ per token because a pool has to look like the asset it holds: 1,200 of a dollar
 * stablecoin and 0.6 of ether are the same size of saver. Two of the seven release less an hour
 * than one base unit a second buys, so the rate is rounded down and the comment says what the
 * rounding costs. Every sponsorship is sized to last more than eighty draws, which is twenty days.
 *
 * USDC keeps the hourly period it was deployed with, and the draws of history that go with it. The
 * six that came later run on six hours, for the gas reason written above SIX_HOUR_TIERS.
 */
const SEPOLIA_TOKENS: Readonly<Record<string, HearthPool>> = {
  usdc: sepoliaPool("usdc", {
    unit: "USDC",
    displayName: "Confidential USDC (Mock)",
    asset: "0x7c5BF43B851c1dff1a4feE8dB225b87f2C223639",
    underlying: "0x9b5Cd13b8eFbB58Dc25A05CF411D8056058aDFfF",
    periodLength: HOUR,
    tiers: TIERS,
    stakes: [1_200, 600, 300, 150, 75],
    // 20 USDC an hour, so 5,555 base units a second and 19.998 USDC a draw.
    perHour: 20,
    // At 20 USDC an hour this is about 20 days of prizes, which covers the judging window without
    // anyone topping the pool up. One call to the mock token's public mint covers it.
    sponsorship: 10_000,
    proveStake: 500,
    // 2,325 USDC is 2.325e9 base units held for 3,600 seconds: 8.37e12 balance-seconds, which sits
    // between 2^42 (4.4e12) and 2^43 (8.8e12), so 43 is the exponent wanted.
    scaleBits: 43,
    keeperAccountIndex: 1,
  }),
  usdt: sepoliaPool("usdt", {
    unit: "USDT",
    displayName: "Confidential USDT (Mock)",
    asset: "0x4E7B06D78965594eB5EF5414c357ca21E1554491",
    underlying: "0xa7dA08FafDC9097Cc0E7D4f113A61e31d7e8e9b0",
    periodLength: SIX_HOURS,
    tiers: SIX_HOUR_TIERS,
    stakes: [1_200, 600, 300, 150, 75],
    // 20 USDT an hour, so 5,555 base units a second and 119.98 USDT a six hour draw.
    perHour: 20,
    // 10,000 USDT at 119.98 a draw is 83 draws, which is 20 days.
    sponsorship: 10_000,
    proveStake: 500,
    // 2,325 USDT is 2.325e9 base units held for 21,600 seconds: 5.022e13 balance-seconds, which
    // sits between 2^45 (3.52e13) and 2^46 (7.04e13).
    scaleBits: 46,
    keeperAccountIndex: 10,
  }),
  weth: sepoliaPool("weth", {
    unit: "WETH",
    displayName: "Confidential WETH (Mock)",
    asset: "0x46208622DA27d91db4f0393733C8BA082ed83158",
    underlying: "0xff54739b16576FA5402F211D0b938469Ab9A5f3F",
    periodLength: SIX_HOURS,
    tiers: SIX_HOUR_TIERS,
    stakes: [0.6, 0.3, 0.15, 0.075, 0.04],
    // 0.01 WETH an hour is 2.77 base units a second, and a rate is whole units a second, so this
    // releases 2 a second and 0.0432 WETH a draw.
    perHour: 0.01,
    // 5 WETH at 0.0432 a draw is 115 draws, which is 28 days.
    sponsorship: 5,
    proveStake: 0.25,
    // 1.165 WETH is 1,165,000 base units held for 21,600 seconds: 2.516e10 balance-seconds, which
    // sits between 2^34 (1.72e10) and 2^35 (3.44e10).
    scaleBits: 35,
    keeperAccountIndex: 11,
  }),
  bron: sepoliaPool("bron", {
    unit: "BRON",
    displayName: "Confidential BRON (Mock)",
    asset: "0xaa5612FA27c927a0c7961f5AEFEE5ba3A0F9C891",
    underlying: "0xFf021fB13cA64e5354c62c954b949a88cfDEb25E",
    periodLength: SIX_HOURS,
    tiers: SIX_HOUR_TIERS,
    stakes: [2_000, 1_000, 500, 250, 125],
    // 30 BRON an hour, so 8,333 base units a second and 179.99 BRON a draw.
    perHour: 30,
    // 15,000 BRON at 179.99 a draw is 83 draws, which is 20 days.
    sponsorship: 15_000,
    proveStake: 800,
    // 3,875 BRON is 3.875e9 base units held for 21,600 seconds: 8.37e13 balance-seconds, which sits
    // between 2^46 (7.04e13) and 2^47 (1.41e14).
    scaleBits: 47,
    keeperAccountIndex: 12,
  }),
  zama: sepoliaPool("zama", {
    unit: "ZAMA",
    displayName: "Confidential ZAMA (Mock)",
    asset: "0xf2D628d2598aF4eAF94CB76a437Ff86CA78FfbFB",
    underlying: "0x75355a85c6FB9df5f0C80FF54e8747EEe9a0BF57",
    periodLength: SIX_HOURS,
    tiers: SIX_HOUR_TIERS,
    stakes: [2_000, 1_000, 500, 250, 125],
    perHour: 30,
    sponsorship: 15_000,
    proveStake: 800,
    // The same 8.37e13 balance-seconds as the BRON pool.
    scaleBits: 47,
    keeperAccountIndex: 13,
  }),
  tgbp: sepoliaPool("tgbp", {
    unit: "tGBP",
    displayName: "Confidential tGBP (Mock)",
    asset: "0xfCE5c7069c5525eF6c8C2b2E35A745bA20a2F7CC",
    underlying: "0x93c931278A2aad1916783F952f94276eA5111442",
    periodLength: SIX_HOURS,
    tiers: SIX_HOUR_TIERS,
    stakes: [1_000, 500, 250, 125, 60],
    // 16 tGBP an hour, so 4,444 base units a second and 95.99 tGBP a draw.
    perHour: 16,
    // 8,000 tGBP at 95.99 a draw is 83 draws, which is 20 days.
    sponsorship: 8_000,
    proveStake: 400,
    // 1,935 tGBP is 1.935e9 base units held for 21,600 seconds: 4.18e13 balance-seconds, which sits
    // between 2^45 (3.52e13) and 2^46 (7.04e13).
    scaleBits: 46,
    keeperAccountIndex: 14,
  }),
  xaut: sepoliaPool("xaut", {
    unit: "XAUt",
    displayName: "Confidential XAUt (Mock)",
    asset: "0xe4FcF848739845BC81Dee1d5352cf3844F0a60C7",
    underlying: "0x24377AE4AA0C45ecEe71225007f17c5D423dd940",
    periodLength: SIX_HOURS,
    tiers: SIX_HOUR_TIERS,
    stakes: [0.4, 0.2, 0.1, 0.05, 0.025],
    // 0.006 XAUt an hour is 1.67 base units a second, so this releases 1 a second and 0.0216 XAUt a
    // draw.
    perHour: 0.006,
    // 3 XAUt at 0.0216 a draw is 138 draws, which is 34 days.
    sponsorship: 3,
    proveStake: 0.15,
    // 0.775 XAUt is 775,000 base units held for 21,600 seconds: 1.674e10 balance-seconds, which
    // sits between 2^33 (8.59e9) and 2^34 (1.72e10).
    scaleBits: 34,
    keeperAccountIndex: 15,
  }),
};

/** The local pool, which deploys its own token pair because no confidential asset exists locally. */
const LOCAL_POOL: HearthPool = {
  slug: "usdc",
  unit: "USDC",
  displayName: "Confidential USDC",
  decimals: WRAPPER_DECIMALS,
  periodLength: 600n,
  firstPeriodAt: "latest-block",
  tiers: TIERS,
  // The same 2.325e9 base units over a 600 second period is near 1.4e12, just above 2^40. The
  // guess is deliberately one bit low so a local run shows the tracker correcting itself.
  initialScaleBits: 40,
  sponsorRatePerSecond: units(1, WRAPPER_DECIMALS),
  initialSponsorship: units(10_000, WRAPPER_DECIMALS),
  seedStakes: [1_200, 600, 300, 150, 75].map((stake) => units(stake, WRAPPER_DECIMALS)),
  proveStake: units(500, WRAPPER_DECIMALS),
  keeperAccountIndex: 1,
};

export const NETWORKS: Record<string, HearthNetwork> = {
  sepolia: { defaultToken: "usdc", tokens: SEPOLIA_TOKENS },
  hardhat: { defaultToken: "usdc", tokens: { usdc: LOCAL_POOL } },
  localhost: { defaultToken: "usdc", tokens: { usdc: LOCAL_POOL } },
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

/** The parameters of one pool. An unknown slug names the ones this network does have. */
export function poolConfig(name: string, slug?: string): HearthPool {
  const network = networkConfig(name);
  const wanted = slug === undefined || slug === "" ? network.defaultToken : slug.toLowerCase();
  const pool = network.tokens[wanted];
  if (!pool) {
    throw new Error(
      `Hearth has no "${wanted}" pool on ${name}. This network runs: ${Object.keys(network.tokens).join(", ")}.`,
    );
  }
  return pool;
}

/** True when the pool runs against a token pair somebody else deployed. */
export function hasCanonicalAsset(pool: HearthPool): boolean {
  return pool.asset !== undefined && pool.underlying !== undefined;
}

/**
 * The hardhat-deploy name of one of a pool's three contracts. The first pool Hearth deployed keeps
 * the bare names, because its records, its verified source and seven draws of history on Sepolia
 * are all filed under them.
 */
export function deploymentName(base: string, slug: string): string {
  return slug === "usdc" ? base : `${base}_${slug}`;
}

/** The file the keeper and the app read a pool's addresses from. */
export function addressFileName(slug: string): string {
  return `hearth.${slug}.json`;
}

/**
 * The first pool's address file, written in the shape it has had since the first deploy. The
 * running keeper and the live app point at it by name, and its seven draws of history are the
 * reason it keeps that shape while hearth.usdc.json carries the same addresses with the new fields.
 */
export const LEGACY_ADDRESS_FILE = "hearth.json";
