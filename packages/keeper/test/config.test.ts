// Covers the settings that let one keeper per pool run side by side: which account each process
// signs from, what it calls itself in the log, and how it formats its pool's token. The seed
// phrase here is the public Hardhat test phrase and holds nothing.
// Does not cover the network, the ABI files, or anything a real .env holds: every test points
// HEARTH_ENV_FILE at a file that does not exist, so no .env on this machine can reach it.
import assert from "node:assert/strict";
import { mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { test } from "node:test";
import { HDNodeWallet } from "ethers";
import { ConfigError, keeperPath, loadConfig } from "../src/config.js";

const PHRASE = "test test test test test test test test test test test junk";
const VAULT = `0x${"01".repeat(20)}`;
const POOL = `0x${"02".repeat(20)}`;
const SOURCE = `0x${"03".repeat(20)}`;

const KEYS = [
  "HEARTH_ENV_FILE",
  "HEARTH_ADDRESSES_FILE",
  "HEARTH_VAULT",
  "HEARTH_POOL",
  "HEARTH_SOURCE",
  "RECOVERY_PHRASE",
  "MNEMONIC",
  "KEEPER_ACCOUNT_INDEX",
  "KEEPER_NAME",
  "KEEPER_POLL_SECONDS",
  "KEEPER_IDLE_SECONDS",
  "KEEPER_NEAR_SECONDS",
  "KEEPER_STAGGER_SECONDS",
  "KEEPER_MAX_RPS",
] as const;

/** Writes an address file and runs loadConfig against it with a clean environment, then puts the
 * environment back, so one test can never colour the next. */
function withFile(contents: unknown, env: Record<string, string> = {}): ReturnType<typeof loadConfig> {
  const saved = new Map(KEYS.map((key) => [key, process.env[key]]));
  const file = join(mkdtempSync(join(tmpdir(), "hearth-keeper-")), "addresses.json");
  writeFileSync(file, JSON.stringify(contents), "utf8");
  try {
    for (const key of KEYS) delete process.env[key];
    process.env["HEARTH_ENV_FILE"] = join(tmpdir(), "hearth-keeper-no-such.env");
    process.env["RECOVERY_PHRASE"] = PHRASE;
    process.env["HEARTH_ADDRESSES_FILE"] = file;
    for (const [key, value] of Object.entries(env)) process.env[key] = value;
    return loadConfig();
  } finally {
    for (const [key, value] of saved) {
      if (value === undefined) delete process.env[key];
      else process.env[key] = value;
    }
  }
}

function addressOf(index: number): string {
  return HDNodeWallet.fromPhrase(PHRASE, "", keeperPath(index)).address;
}

const USDC_POOL = {
  vault: VAULT,
  pool: POOL,
  source: SOURCE,
  slug: "usdc",
  symbol: "cUSDC",
  decimals: 6,
  keeperAccountIndex: 1,
};

test("the signing account comes from the env, then the address file, then account 1", () => {
  const fromEnv = withFile({ ...USDC_POOL, keeperAccountIndex: 11 }, { KEEPER_ACCOUNT_INDEX: "13" });
  assert.equal(fromEnv.config.accountIndex, 13);
  assert.equal(fromEnv.config.keeperAddress, addressOf(13));

  const fromFile = withFile({ ...USDC_POOL, keeperAccountIndex: 11 });
  assert.equal(fromFile.config.accountIndex, 11);
  assert.equal(fromFile.config.keeperAddress, addressOf(11));

  const fallback = withFile({ vault: VAULT, pool: POOL });
  assert.equal(fallback.config.accountIndex, 1);
  assert.equal(fallback.config.keeperAddress, addressOf(1));
});

test("every pool signs from its own account, which is what keeps the nonces apart", () => {
  const usdc = withFile({ ...USDC_POOL, keeperAccountIndex: 1 });
  const weth = withFile({ ...USDC_POOL, slug: "weth", keeperAccountIndex: 11 });
  assert.notEqual(usdc.config.keeperAddress, weth.config.keeperAddress);
});

test("an account index that is not a whole number, or is the deployer's, is refused", () => {
  for (const bad of ["nine", "1.5", "-1", "0"]) {
    assert.throws(
      () => withFile(USDC_POOL, { KEEPER_ACCOUNT_INDEX: bad }),
      (error: unknown) =>
        error instanceof ConfigError && error.message.includes("KEEPER_ACCOUNT_INDEX must be a whole number"),
      `index "${bad}" should have been refused`,
    );
  }
});

test("a bad index inside the address file is refused too, and names the field", () => {
  assert.throws(
    () => withFile({ ...USDC_POOL, keeperAccountIndex: "eleven" }),
    (error: unknown) => error instanceof ConfigError && error.message.includes('"keeperAccountIndex"'),
  );
});

test("the older address file, with only the three addresses, still loads", () => {
  const { config } = withFile({ vault: VAULT, pool: POOL, source: SOURCE });
  assert.equal(config.vault, VAULT);
  assert.equal(config.pool, POOL);
  assert.equal(config.source, SOURCE);
  assert.equal(config.name, "hearth");
  assert.equal(config.accountIndex, 1);
  assert.equal(config.symbol, "cUSDC");
  assert.equal(config.decimals, 6);
});

test("the log name is the pool's slug, and KEEPER_NAME overrides it", () => {
  assert.equal(withFile({ ...USDC_POOL, slug: "weth" }).config.name, "weth");
  assert.equal(withFile({ ...USDC_POOL, slug: "weth" }, { KEEPER_NAME: "weth-backup" }).config.name, "weth-backup");
});

test("the token symbol and decimals come from the address file", () => {
  const { config } = withFile({ ...USDC_POOL, slug: "weth", symbol: "cWETH", decimals: 9 });
  assert.equal(config.symbol, "cWETH");
  assert.equal(config.decimals, 9);
});

test("the resting rates default to ten minutes and two minutes, and the environment sets them", () => {
  const { config } = withFile(USDC_POOL);
  assert.equal(config.pollMs, 30_000);
  assert.equal(config.idleMs, 600_000);
  assert.equal(config.nearMs, 120_000);

  const tuned = withFile(USDC_POOL, { KEEPER_IDLE_SECONDS: "900", KEEPER_NEAR_SECONDS: "45" }).config;
  assert.equal(tuned.idleMs, 900_000);
  assert.equal(tuned.nearMs, 45_000);
});

test("a resting rate outside its range is refused rather than quietly clamped", () => {
  const bad = [
    ["KEEPER_IDLE_SECONDS", "29"],
    ["KEEPER_IDLE_SECONDS", "3601"],
    ["KEEPER_IDLE_SECONDS", "ten minutes"],
    ["KEEPER_NEAR_SECONDS", "0"],
    ["KEEPER_NEAR_SECONDS", "1801"],
    ["KEEPER_NEAR_SECONDS", "90.5"],
  ] as const;
  for (const [key, value] of bad) {
    assert.throws(
      () => withFile(USDC_POOL, { [key]: value }),
      (error: unknown) => error instanceof ConfigError && error.message.includes(`${key} must be a whole number`),
      `${key}="${value}" should have been refused`,
    );
  }
});

test("the offset that spreads seven keepers comes from the account index, and the setting wins", () => {
  assert.equal(withFile({ ...USDC_POOL, keeperAccountIndex: 12 }).config.staggerMs, 16_000);
  assert.equal(withFile({ ...USDC_POOL, keeperAccountIndex: 1 }).config.staggerMs, 4_000);
  assert.equal(withFile(USDC_POOL, { KEEPER_STAGGER_SECONDS: "0" }).config.staggerMs, 0);
  assert.equal(withFile(USDC_POOL, { KEEPER_STAGGER_SECONDS: "45" }).config.staggerMs, 45_000);
});

test("the keeper's own speed limit defaults to fifteen requests a second, and the setting wins", () => {
  assert.equal(withFile(USDC_POOL).config.minGapMs, 67);
  assert.equal(withFile(USDC_POOL, { KEEPER_MAX_RPS: "10" }).config.minGapMs, 100);
  assert.equal(withFile(USDC_POOL, { KEEPER_MAX_RPS: "100" }).config.minGapMs, 10);
});

test("an offset or a speed limit outside its range is refused rather than quietly clamped", () => {
  const bad = [
    ["KEEPER_STAGGER_SECONDS", "-1"],
    ["KEEPER_STAGGER_SECONDS", "61"],
    ["KEEPER_STAGGER_SECONDS", "4.5"],
    ["KEEPER_MAX_RPS", "0"],
    ["KEEPER_MAX_RPS", "101"],
    ["KEEPER_MAX_RPS", "fast"],
  ] as const;
  for (const [key, value] of bad) {
    assert.throws(
      () => withFile(USDC_POOL, { [key]: value }),
      (error: unknown) => error instanceof ConfigError && error.message.includes(`${key} must be a whole number`),
      `${key}="${value}" should have been refused`,
    );
  }
});
