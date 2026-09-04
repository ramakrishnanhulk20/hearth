// Copies the two ABIs the keeper needs out of the compiled artifacts and into the package, so a
// deployed keeper can run without the contracts toolchain. Never edit the output by hand: run this.
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
const artifacts = join(here, "..", "..", "contracts", "artifacts", "contracts");
const out = join(here, "..", "abi");
mkdirSync(out, { recursive: true });

for (const name of ["HearthPrizePool", "HearthVault"]) {
  const source = join(artifacts, `${name}.sol`, `${name}.json`);
  const parsed = JSON.parse(readFileSync(source, "utf8"));
  if (!Array.isArray(parsed.abi) || parsed.abi.length === 0) {
    throw new Error(`${source} has no abi array. Compile the contracts first.`);
  }
  writeFileSync(join(out, `${name}.json`), `${JSON.stringify({ contractName: name, abi: parsed.abi }, null, 2)}\n`);
  console.log(`${name}: ${parsed.abi.length} entries`);
}
