#!/usr/bin/env node
import { loadConfig } from "./config.js";
import { Keeper } from "./keeper.js";
import { line, problem, useName } from "./log.js";

const USAGE = `hearth-keeper: drives Hearth draws on Sepolia.

  hearth-keeper              run forever, one pass every KEEPER_POLL_SECONDS
  hearth-keeper --once       run one pass and exit
  hearth-keeper --dry-run    simulate every call and print what would be sent, send nothing
  hearth-keeper --help       this text

Settings come from packages/contracts/.env (and packages/keeper/.env if you make one).
Required: RECOVERY_PHRASE, HEARTH_VAULT, HEARTH_POOL. See the package README for the rest.

One process drives one pool. HEARTH_ADDRESSES_FILE names the pool, KEEPER_ACCOUNT_INDEX picks the
account it signs from, and KEEPER_NAME is the name printed in front of every line.`;

interface Flags {
  readonly once: boolean;
  readonly dryRun: boolean;
  readonly help: boolean;
  readonly unknown: string[];
}

export function parseArgs(argv: readonly string[]): Flags {
  const unknown: string[] = [];
  let once = false;
  let dryRun = false;
  let help = false;
  for (const arg of argv) {
    if (arg === "--once") once = true;
    else if (arg === "--dry-run" || arg === "--dryrun") dryRun = true;
    else if (arg === "--help" || arg === "-h") help = true;
    else unknown.push(arg);
  }
  return { once, dryRun, help, unknown };
}

async function main(): Promise<number> {
  const flags = parseArgs(process.argv.slice(2));
  if (flags.help) {
    process.stdout.write(`${USAGE}\n`);
    return 0;
  }
  if (flags.unknown.length > 0) {
    process.stderr.write(`I do not know the option ${flags.unknown.join(" ")}.\n\n${USAGE}\n`);
    return 2;
  }

  const loaded = loadConfig({ dryRun: flags.dryRun });
  useName(loaded.config.name);
  const keeper = await Keeper.connect(loaded);

  if (flags.once) {
    await keeper.tick();
    return 0;
  }

  for (const signal of ["SIGINT", "SIGTERM"] as const) {
    process.on(signal, () => {
      line(`${signal} received, finishing this pass and stopping`);
      keeper.stop();
    });
  }
  await keeper.run();
  return 0;
}

main()
  .then((code) => {
    process.exitCode = code;
  })
  .catch((error: unknown) => {
    problem(error instanceof Error ? error.message : String(error));
    process.exitCode = 1;
  });
