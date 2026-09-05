// Turns the contract deployment files into the one list the app reads.
//
// Run it after every deploy: node scripts/sync-pools.mjs
//
// The app must never carry an address that was typed by hand, so every open pool here comes from
// a file the deploy script wrote. The one exception is the restricted token below, which has no
// deployment because Hearth cannot open a pool on it at all.

import { readdir, readFile, writeFile } from "node:fs/promises";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
const DEPLOYMENTS = resolve(here, "..", "..", "contracts", "deployments", "sepolia");
const OUTPUT = resolve(here, "..", "src", "lib", "chain", "pools.json");

const CHAIN_ID = 11155111;

/** The order savers see, everywhere. Anything not named here sorts after them, alphabetically. */
const ORDER = ["usdc", "usdt", "weth", "bron", "zama", "tgbp", "xaut", "tgbp-official"];

/**
 * The first deployment predates the multi-pool file shape, so it carries only the addresses.
 * These are the fields it would have been written with today.
 */
const FIRST_DEPLOYMENT = {
  slug: "usdc",
  symbol: "cUSDCMock",
  underlyingSymbol: "USDCMock",
  name: "Confidential USDC (Mock)",
  decimals: 6,
};

/**
 * Zama's own tGBP on Sepolia. It is listed because a saver will look for it, and refused because
 * its underlying mint is restricted to the issuer, so nobody can wrap into it and no pool can be
 * opened on it. Saying that out loud beats leaving it off the list and looking incomplete.
 */
const RESTRICTED = [
  {
    slug: "tgbp-official",
    name: "Confidential tGBP",
    symbol: "ctGBP",
    underlyingSymbol: "tGBP",
    asset: "0x167DC962808B32CFFFc7e14B5018c0bE06A3A208",
    underlying: "0xf6Ef9ADB61A48E29E36bc873070A46A3D2667ff3",
    status: "restricted",
    reason: "mint restricted to the issuer",
  },
];

/**
 * Only the deploy script's own files: hearth.json for the first pool and hearth.<slug>.json for
 * every one after it. The compiler artefacts sit in the same folder and differ only in case,
 * which is why this is matched case-sensitively.
 */
const DEPLOYMENT_FILE = /^hearth([.-][a-z0-9.-]+)?\.json$/;

const REQUIRED = ["vault", "pool", "source", "asset", "underlying", "firstPeriodAt", "periodLength"];

function rank(slug) {
  const index = ORDER.indexOf(slug);
  return index === -1 ? ORDER.length : index;
}

async function main() {
  const all = (await readdir(DEPLOYMENTS)).filter((name) => DEPLOYMENT_FILE.test(name)).sort();
  // hearth.json is the first pool as the deploy script first wrote it; once hearth.usdc.json
  // exists it carries the same pool with the richer fields, and reading both would list usdc twice.
  const names = all.includes("hearth.usdc.json") ? all.filter((name) => name !== "hearth.json") : all;

  const open = [];
  for (const name of names) {
    const raw = JSON.parse(await readFile(join(DEPLOYMENTS, name), "utf8"));
    const missing = REQUIRED.filter((field) => raw[field] === undefined);
    if (missing.length > 0) {
      throw new Error(`${name} is missing ${missing.join(", ")}, so it is not a finished deployment.`);
    }

    const filled = name === "hearth.json" ? { ...FIRST_DEPLOYMENT, ...raw } : raw;
    if (!filled.slug) throw new Error(`${name} has no slug, so the app has no route to put it on.`);

    open.push({
      slug: filled.slug,
      name: filled.name ?? filled.slug,
      symbol: filled.symbol ?? filled.slug.toUpperCase(),
      underlyingSymbol: filled.underlyingSymbol ?? filled.symbol ?? filled.slug.toUpperCase(),
      decimals: Number(filled.decimals ?? 6),
      vault: filled.vault,
      pool: filled.pool,
      source: filled.source,
      asset: filled.asset,
      underlying: filled.underlying,
      firstPeriodAt: Number(filled.firstPeriodAt),
      periodLength: Number(filled.periodLength),
      status: "open",
    });
  }

  const seen = new Set();
  for (const entry of [...open, ...RESTRICTED]) {
    if (seen.has(entry.slug)) throw new Error(`Two pools claim the slug "${entry.slug}".`);
    seen.add(entry.slug);
  }

  const pools = [...open, ...RESTRICTED].sort((a, b) => rank(a.slug) - rank(b.slug) || a.slug.localeCompare(b.slug));

  await writeFile(OUTPUT, `${JSON.stringify({ chainId: CHAIN_ID, pools }, null, 2)}\n`, "utf8");

  console.log(`Wrote ${OUTPUT}`);
  console.log(`${pools.length} pools, from ${names.length} deployment file${names.length === 1 ? "" : "s"}:`);
  for (const entry of pools) {
    const where = entry.status === "open" ? `vault ${entry.vault}` : `restricted: ${entry.reason}`;
    console.log(`  ${entry.slug.padEnd(14)} ${entry.symbol.padEnd(11)} ${where}`);
  }
}

main().catch((error) => {
  console.error(error.message);
  process.exit(1);
});
