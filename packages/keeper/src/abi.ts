import { existsSync, readFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { Interface } from "ethers";
import type { InterfaceAbi } from "ethers";

export class AbiError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "AbiError";
  }
}

const ARTIFACT_ROOT = join("packages", "contracts", "artifacts", "contracts");

/**
 * Walks up from a starting directory until it finds the workspace root, recognised by the
 * contracts package. The keeper runs both from source and from dist, and pm2 may start it from
 * any working directory, so the root is found rather than assumed.
 */
export function findRepoRoot(startDir?: string): string {
  const start = startDir ?? dirname(fileURLToPath(import.meta.url));
  let dir = resolve(start);
  for (let i = 0; i < 8; i++) {
    if (existsSync(join(dir, "packages", "contracts", "hardhat.config.ts"))) return dir;
    const parent = dirname(dir);
    if (parent === dir) break;
    dir = parent;
  }
  throw new AbiError(
    `Could not find the Hearth repo root above ${start}. ` +
      `Set HEARTH_ARTIFACTS_DIR to the contracts artifacts folder (…/packages/contracts/artifacts/contracts).`,
  );
}

export function artifactsDir(): string {
  const override = process.env["HEARTH_ARTIFACTS_DIR"];
  if (override && override.trim() !== "") return resolve(override.trim());
  return join(findRepoRoot(), ARTIFACT_ROOT);
}

interface Artifact {
  readonly contractName?: string;
  readonly abi?: InterfaceAbi;
}

/** Reads a Hardhat artifact and returns its ABI. The ABI is never hand written, so a contract
 * rename or a missing compile is reported here instead of failing on the first call. */
export function loadAbi(contractName: string, dir = artifactsDir()): InterfaceAbi {
  const file = join(dir, `${contractName}.sol`, `${contractName}.json`);
  if (!existsSync(file)) {
    throw new AbiError(
      `No compiled ABI at ${file}. Run "npm run compile -w @hearth/contracts" first, ` +
        `or point HEARTH_ARTIFACTS_DIR at the folder that holds it.`,
    );
  }
  let parsed: Artifact;
  try {
    parsed = JSON.parse(readFileSync(file, "utf8")) as Artifact;
  } catch (error) {
    throw new AbiError(`${file} is not readable JSON: ${(error as Error).message}`);
  }
  const abi = parsed.abi;
  if (!Array.isArray(abi) || abi.length === 0) {
    throw new AbiError(`${file} has no "abi" array. It is probably not a Hardhat artifact.`);
  }
  return abi;
}

/** Everything the keeper calls on the prize pool. */
export const POOL_FUNCTIONS = [
  "currentPeriod",
  "closableDraw",
  "closeDeadline",
  "closeDraw",
  "awardDraw",
  "reconcile",
  "reconcileEvery",
  "drawOf",
] as const;

/** Everything the keeper calls on the vault. */
export const VAULT_FUNCTIONS = [
  "evaluate",
  "cursorOf",
  "walkOf",
  "evaluatedCount",
  "finalizeDraw",
  "finalized",
  "publishedCarry",
  "windowEndsAt",
  "saverCount",
] as const;

/** Exact overloads the keeper picks by signature, because the name alone is ambiguous. */
export const POOL_SIGNATURES = ["closeDraw(uint32)"] as const;

/** Fields the keeper reads off the struct that drawOf returns. */
export const DRAW_FIELDS = [
  "status",
  "seedHandle",
  "scaleHandle",
  "nonEmptyHandle",
  "harvestHandle",
  "scaleBits",
] as const;

function functionNames(abi: InterfaceAbi): Set<string> {
  const names = new Set<string>();
  const iface = new Interface(abi);
  iface.forEachFunction((fn) => names.add(fn.name));
  return names;
}

function functionSignatures(abi: InterfaceAbi): Set<string> {
  const signatures = new Set<string>();
  const iface = new Interface(abi);
  iface.forEachFunction((fn) => signatures.add(fn.format("sighash")));
  return signatures;
}

/** Where each named field sits inside the struct a single-struct view returns. Read from the ABI
 * so the keeper never depends on the declaration order staying put. */
export function structFieldIndex(abi: InterfaceAbi, functionName: string): Map<string, number> {
  const index = new Map<string, number>();
  structFieldNames(abi, functionName).forEach((name, position) => index.set(name, position));
  return index;
}

/** Names of the struct fields returned by a single-struct view, in declaration order. */
export function structFieldNames(abi: InterfaceAbi, functionName: string): string[] {
  const iface = new Interface(abi);
  let found: string[] = [];
  iface.forEachFunction((fn) => {
    if (fn.name !== functionName) return;
    const first = fn.outputs[0];
    if (first === undefined) return;
    found = (first.components ?? []).map((component) => component.name);
  });
  return found;
}

/**
 * Fails at boot, with every mismatch in one message, when the deployed ABI does not carry the
 * names this keeper calls. A silent name drift between the contracts and the keeper would
 * otherwise only show up as a revert in the middle of a draw.
 */
export function checkAbis(poolAbi: InterfaceAbi, vaultAbi: InterfaceAbi): void {
  const problems: string[] = [];

  const poolNames = functionNames(poolAbi);
  for (const name of POOL_FUNCTIONS) {
    if (!poolNames.has(name)) problems.push(`HearthPrizePool has no function named ${name}`);
  }

  const poolSignatures = functionSignatures(poolAbi);
  for (const signature of POOL_SIGNATURES) {
    if (!poolSignatures.has(signature)) problems.push(`HearthPrizePool has no function ${signature}`);
  }

  const vaultNames = functionNames(vaultAbi);
  for (const name of VAULT_FUNCTIONS) {
    if (!vaultNames.has(name)) problems.push(`HearthVault has no function named ${name}`);
  }

  if (poolNames.has("drawOf")) {
    const fields = new Set(structFieldNames(poolAbi, "drawOf"));
    for (const field of DRAW_FIELDS) {
      if (!fields.has(field)) problems.push(`HearthPrizePool.drawOf does not return a field named ${field}`);
    }
  }

  if (problems.length > 0) {
    throw new AbiError(
      `The compiled contracts do not match what this keeper calls:\n  ${problems.join("\n  ")}\n` +
        `Recompile the contracts, or tell the contract author which names moved.`,
    );
  }
}
