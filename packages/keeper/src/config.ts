import { existsSync, readFileSync } from "node:fs";
import { join, resolve } from "node:path";
import dotenv from "dotenv";
import { HDNodeWallet, Mnemonic, getAddress, isAddress, parseUnits } from "ethers";
import { findRepoRoot } from "./abi.js";
// Aliased because this file already has its own gwei(), the parser that reads the setting.
import { gwei as formatGwei } from "./log.js";

export class ConfigError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ConfigError";
  }
}

/** Account index 1 of the seed phrase. Index 0 is the deployer and owns the contracts, so the
 * keeper runs on its own address and a stuck keeper nonce never blocks a deploy. */
export const KEEPER_PATH = "m/44'/60'/0'/0/1";

const DEFAULT_RPC = "https://ethereum-sepolia-rpc.publicnode.com";
const SEPOLIA_CHAIN_ID = 11155111;

export interface RelayerSettings {
  readonly attempts: number;
  readonly baseDelayMs: number;
  readonly maxDelayMs: number;
  readonly timeoutMs: number;
}

export interface KeeperConfig {
  readonly rpcUrl: string;
  readonly chainId: number;
  readonly keeperAddress: string;
  readonly vault: string;
  readonly pool: string;
  readonly source: string | null;
  readonly pollMs: number;
  readonly batchSize: number;
  readonly lookbackDraws: number;
  /** Zero means "start at the current window", any other value pins the oldest draw watched. */
  readonly scanFrom: number;
  readonly confirmations: number;
  readonly maxFeePerGas: bigint | null;
  readonly maxPriorityFeePerGas: bigint | null;
  readonly gasLimit: bigint | null;
  readonly dryRun: boolean;
  readonly relayer: RelayerSettings;
}

export interface LoadedKeeper {
  readonly config: KeeperConfig;
  /** Held next to the config rather than inside it, so nothing that prints a config can print a key. */
  readonly wallet: HDNodeWallet;
}

export interface ConfigOverrides {
  readonly dryRun?: boolean;
}

/** Loads .env files without overwriting anything already in the environment, so a value passed on
 * the command line or by pm2 always wins over a file. */
function loadEnvFiles(): string[] {
  const loaded: string[] = [];
  const explicit = process.env["HEARTH_ENV_FILE"];
  const candidates = explicit
    ? [resolve(explicit)]
    : (() => {
        const root = findRepoRoot();
        return [join(root, "packages", "keeper", ".env"), join(root, "packages", "contracts", ".env")];
      })();
  for (const file of candidates) {
    if (!existsSync(file)) continue;
    dotenv.config({ path: file });
    loaded.push(file);
  }
  return loaded;
}

function text(name: string): string | null {
  const value = process.env[name];
  if (value === undefined) return null;
  const trimmed = value.trim();
  return trimmed === "" ? null : trimmed;
}

function integer(name: string, fallback: number, min: number, max: number, problems: string[]): number {
  const raw = text(name);
  if (raw === null) return fallback;
  const value = Number(raw);
  if (!Number.isInteger(value) || value < min || value > max) {
    problems.push(`${name} must be a whole number between ${min} and ${max}, got "${raw}"`);
    return fallback;
  }
  return value;
}

function flag(name: string, fallback: boolean, problems: string[]): boolean {
  const raw = text(name);
  if (raw === null) return fallback;
  const lowered = raw.toLowerCase();
  if (["1", "true", "yes", "on"].includes(lowered)) return true;
  if (["0", "false", "no", "off"].includes(lowered)) return false;
  problems.push(`${name} must be true or false, got "${raw}"`);
  return fallback;
}

function gwei(name: string, problems: string[]): bigint | null {
  const raw = text(name);
  if (raw === null) return null;
  try {
    const value = parseUnits(raw, "gwei");
    if (value <= 0n) {
      problems.push(`${name} must be above zero, got "${raw}"`);
      return null;
    }
    return value;
  } catch {
    problems.push(`${name} must be a gas price in gwei, for example 8 or 2.5, got "${raw}"`);
    return null;
  }
}

function address(name: string, raw: string | null, problems: string[]): string | null {
  if (raw === null) return null;
  if (!isAddress(raw)) {
    problems.push(`${name} is not an Ethereum address: "${raw}"`);
    return null;
  }
  return getAddress(raw);
}

interface AddressFile {
  readonly vault?: string;
  readonly pool?: string;
  readonly source?: string;
  readonly HearthVault?: string;
  readonly HearthPrizePool?: string;
  readonly SponsoredYieldSource?: string;
}

function addressesFromFile(problems: string[]): AddressFile {
  const path = text("HEARTH_ADDRESSES_FILE");
  if (path === null) return {};
  const file = resolve(path);
  if (!existsSync(file)) {
    problems.push(`HEARTH_ADDRESSES_FILE points at ${file}, which does not exist`);
    return {};
  }
  try {
    return JSON.parse(readFileSync(file, "utf8")) as AddressFile;
  } catch (error) {
    problems.push(`${file} is not readable JSON: ${(error as Error).message}`);
    return {};
  }
}

function keeperWallet(problems: string[]): HDNodeWallet | null {
  const phrase = text("RECOVERY_PHRASE") ?? text("MNEMONIC");
  if (phrase === null) {
    problems.push(
      "RECOVERY_PHRASE is missing. Put your twelve word seed phrase in packages/contracts/.env; " +
        "the keeper signs with account 2 of that phrase and never prints it.",
    );
    return null;
  }
  if (!Mnemonic.isValidMnemonic(phrase)) {
    problems.push("RECOVERY_PHRASE is not a valid seed phrase. Check the word count and the spelling.");
    return null;
  }
  return HDNodeWallet.fromPhrase(phrase, "", KEEPER_PATH);
}

export function loadConfig(overrides: ConfigOverrides = {}): LoadedKeeper {
  const files = loadEnvFiles();
  const problems: string[] = [];

  const wallet = keeperWallet(problems);
  const fromFile = addressesFromFile(problems);

  const vault = address("HEARTH_VAULT", text("HEARTH_VAULT") ?? fromFile.vault ?? fromFile.HearthVault ?? null, problems);
  const pool = address(
    "HEARTH_POOL",
    text("HEARTH_POOL") ?? fromFile.pool ?? fromFile.HearthPrizePool ?? null,
    problems,
  );
  const source = address(
    "HEARTH_SOURCE",
    text("HEARTH_SOURCE") ?? fromFile.source ?? fromFile.SponsoredYieldSource ?? null,
    problems,
  );

  if (vault === null && !problems.some((p) => p.startsWith("HEARTH_VAULT"))) {
    problems.push("HEARTH_VAULT is missing. Set it to the deployed HearthVault address.");
  }
  if (pool === null && !problems.some((p) => p.startsWith("HEARTH_POOL"))) {
    problems.push("HEARTH_POOL is missing. Set it to the deployed HearthPrizePool address.");
  }

  const pollSeconds = integer("KEEPER_POLL_SECONDS", 30, 5, 3600, problems);
  const batchSize = integer("KEEPER_BATCH", 4, 1, 256, problems);
  const lookbackDraws = integer("KEEPER_LOOKBACK_DRAWS", 4, 1, 64, problems);
  const scanFrom = integer("KEEPER_SCAN_FROM", 0, 0, 1_000_000, problems);
  const confirmations = integer("KEEPER_CONFIRMATIONS", 1, 1, 12, problems);
  const chainId = integer("KEEPER_CHAIN_ID", SEPOLIA_CHAIN_ID, 1, 2 ** 31, problems);
  const gasLimitRaw = integer("KEEPER_GAS_LIMIT", 0, 0, 40_000_000, problems);

  const relayer: RelayerSettings = {
    attempts: integer("KEEPER_RELAYER_ATTEMPTS", 8, 1, 30, problems),
    baseDelayMs: integer("KEEPER_RELAYER_BASE_DELAY_MS", 3_000, 200, 60_000, problems),
    maxDelayMs: integer("KEEPER_RELAYER_MAX_DELAY_MS", 45_000, 1_000, 600_000, problems),
    timeoutMs: integer("KEEPER_RELAYER_TIMEOUT_MS", 120_000, 5_000, 900_000, problems),
  };

  const config: KeeperConfig = {
    rpcUrl: text("SEPOLIA_RPC_URL") ?? DEFAULT_RPC,
    chainId,
    keeperAddress: wallet?.address ?? "",
    vault: vault ?? "",
    pool: pool ?? "",
    source,
    pollMs: pollSeconds * 1000,
    batchSize,
    lookbackDraws,
    scanFrom,
    confirmations,
    maxFeePerGas: gwei("KEEPER_MAX_FEE_GWEI", problems),
    maxPriorityFeePerGas: gwei("KEEPER_MAX_PRIORITY_FEE_GWEI", problems),
    gasLimit: gasLimitRaw > 0 ? BigInt(gasLimitRaw) : null,
    dryRun: overrides.dryRun === true ? true : flag("KEEPER_DRY_RUN", false, problems),
    relayer,
  };

  if (config.relayer.maxDelayMs < config.relayer.baseDelayMs) {
    problems.push("KEEPER_RELAYER_MAX_DELAY_MS must not be below KEEPER_RELAYER_BASE_DELAY_MS");
  }

  if (problems.length > 0) {
    const where = files.length > 0 ? files.join(", ") : "no .env file was found";
    throw new ConfigError(
      `The keeper cannot start. Fix these and run it again (env read from: ${where}):\n  ${problems.join("\n  ")}`,
    );
  }

  if (wallet === null) throw new ConfigError("The keeper cannot start: no signing account.");
  return { config, wallet };
}

/** A one line summary for the boot log. Holds no key and no phrase. */
export function describeConfig(config: KeeperConfig): string {
  const gas = config.maxFeePerGas === null ? "no gas cap" : `gas cap ${formatGwei(config.maxFeePerGas)} gwei`;
  const mode = config.dryRun ? "dry run" : "live";
  return (
    `${mode}, keeper ${config.keeperAddress}, vault ${config.vault}, pool ${config.pool}, ` +
    `batch ${config.batchSize}, poll ${config.pollMs / 1000}s, ${gas}`
  );
}
