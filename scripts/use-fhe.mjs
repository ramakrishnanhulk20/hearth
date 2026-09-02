/**
 * Switches the FHE Solidity library between the version the local simulator supports and the
 * version running on Sepolia.
 *
 * Sepolia's coprocessor is on v0.13, but Zama's Hardhat plugin pins v0.11 and ships the host
 * contracts it simulates against, so there is no local test environment for v0.13 and no sign of
 * one coming. Hearth only uses operations that exist identically in both, so the contract source
 * never changes. This swaps which library that identical source is compiled against: v0.11 to run
 * the suite locally in seconds, v0.13 to build what actually goes on chain.
 *
 * The obligation this creates is a live end-to-end run against the deployed v0.13 build before
 * release, so the tested behaviour and the deployed behaviour are known to agree rather than
 * assumed to.
 */
import { execSync } from "node:child_process";
import { readFileSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

// 0.13.3 is listed but is not what `fhe:ship` uses. Hardhat plugin 0.4.2, the newest there is,
// checks the library's ZamaConfig.sol by matching the text of its `_getEthereumConfig` block
// exactly, and 0.13.3 dropped two placeholder comment lines from that block. Every address in the
// file is identical, so this is a plugin text check rather than a protocol change, but it makes
// `hardhat compile` fail before solc ever runs. Move `fhe:ship` to 0.13.3 once the plugin follows.
const SUPPORTED = {
  "0.11.1": { mode: "local simulator + live network", peers: "satisfied" },
  "0.13.2": { mode: "live network only", peers: "overridden" },
  "0.13.3": { mode: "live network only, blocked by hardhat plugin 0.4.2", peers: "overridden" },
};

const version = process.argv[2];
if (!SUPPORTED[version]) {
  console.error(`Unknown version ${version}. Expected one of: ${Object.keys(SUPPORTED).join(", ")}`);
  process.exit(1);
}

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const manifestPath = join(root, "package.json");

// Written with the JSON serialiser rather than a shell redirect: a byte-order mark here would be
// invisible on screen and would make every strict JSON parser downstream reject the file.
const manifest = JSON.parse(readFileSync(manifestPath, "utf8"));
manifest.dependencies["@fhevm/solidity"] = version;
writeFileSync(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`, "utf8");

// v0.13 is newer than anything in the dependency graph declares support for, so peer checks have
// to be relaxed for it. v0.11 satisfies every declared peer and must not be, because relaxing them
// stops npm hoisting the library to the root where the Hardhat plugin looks for it.
let command = "npm install --no-audit --no-fund";
if (version !== "0.11.1") command += " --legacy-peer-deps";

console.log(`Switching @fhevm/solidity to ${version} (${SUPPORTED[version].mode})`);
// A literal command string rather than an argument array: npm on Windows is a .cmd shim that
// execFileSync cannot launch without a shell, and every part of this command is a constant.
execSync(command, { cwd: root, stdio: "inherit" });
