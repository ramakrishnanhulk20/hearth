// Covers the resting rate: how long the keeper sleeps between passes, and the two question pass it
// makes while there is nothing to do. The stub chain is the same shape as the one in tick.test.ts,
// cut down to the reads an idle pool answers, and it counts every read so the saving can be
// asserted rather than argued about.
// Does not cover the boot read of the two immutables, the relayer, or anything a pass does once it
// finds work: that is tick.test.ts.
import assert from "node:assert/strict";
import { test } from "node:test";
import type { Contract, JsonRpcProvider } from "ethers";
import type { KeeperConfig } from "../src/config.js";
import type { WakeSnapshot } from "../src/keeper.js";
import { Keeper, nextWake } from "../src/keeper.js";
import type { Decryptor } from "../src/relayer.js";

const SIX_HOURS = 6 * 3600;
const POLL = 30_000;
const IDLE = 600_000;
const NEAR = 120_000;

const FIRST_PERIOD_AT = 1_750_000_000;

/** A pool in the middle of period 3 of a six-hour cadence, with nothing pending. */
function resting(): WakeSnapshot {
  return {
    pending: false,
    period: 3,
    firstPeriodAt: FIRST_PERIOD_AT,
    periodLength: SIX_HOURS,
    pollMs: POLL,
    idleMs: IDLE,
    nearMs: NEAR,
  };
}

/** Unix seconds at which the period in a snapshot ends. */
function endOf(snapshot: WakeSnapshot): number {
  return snapshot.firstPeriodAt + snapshot.period * snapshot.periodLength;
}

test("a pass that left work behind is followed by another at the poll rate", () => {
  const snapshot = { ...resting(), pending: true };
  assert.equal(nextWake(snapshot, endOf(snapshot) - SIX_HOURS / 2), POLL);
});

test("the keeper polls on both sides of a period boundary", () => {
  const snapshot = resting();
  const end = endOf(snapshot);
  for (const now of [end - NEAR / 1000, end - 60, end, end + 60, end + NEAR / 1000]) {
    assert.equal(nextWake(snapshot, now), POLL, `${end - now}s from the boundary should poll`);
  }
});

test("deep inside a six hour period the keeper sleeps the whole idle time", () => {
  const snapshot = resting();
  assert.equal(nextWake(snapshot, endOf(snapshot) - SIX_HOURS + 1), IDLE);
  assert.equal(nextWake(snapshot, endOf(snapshot) - 3600), IDLE);
});

test("a boundary closer than the idle time wakes the keeper exactly as the window opens", () => {
  const snapshot = resting();
  const now = endOf(snapshot) - 300;
  assert.equal(nextWake(snapshot, now), 300_000 - NEAR);
  assert.equal(nextWake(snapshot, now + (300_000 - NEAR) / 1000), POLL, "and the next wake is inside the window");
});

test("the sleep never drops below the poll rate, and an unreadable period keeps the fast rate", () => {
  const snapshot = resting();
  // A period the keeper read before it slept through the boundary: the arithmetic says the wake is
  // overdue, and the floor sends it to look rather than returning a negative or zero wait.
  assert.equal(nextWake(snapshot, endOf(snapshot) + SIX_HOURS), POLL);
  assert.equal(nextWake(snapshot, endOf(snapshot) - 130), POLL, "a wait of ten seconds is rounded up to the poll rate");
  assert.equal(nextWake({ ...snapshot, pollMs: 60_000, idleMs: 30_000 }, endOf(snapshot) - 3600), 60_000);
  assert.equal(nextWake({ ...snapshot, firstPeriodAt: 0, periodLength: 0 }, FIRST_PERIOD_AT), POLL);
});

const DRAW_FIELDS = ["status", "offered", "prize", "seedHandle", "scaleHandle", "nonEmptyHandle", "harvestHandle"];

const WRITES = new Set(["closeDraw(uint32)"]);

/** An idle pool: no draw to close, no savers, no carry pending. Only `period` moves, because that
 *  is the one thing a resting keeper is watching for. */
class IdleChain {
  period: number;
  closableDraw = 0;
  reads = 0;
  readonly sent: string[] = [];
  readonly now: number;

  constructor(period: number, now: number) {
    this.period = period;
    this.now = now;
  }

  contract(): Contract {
    const chain = this;
    return {
      interface: { parseError: (): null => null },
      getFunction(signature: string) {
        const call = async (): Promise<unknown> => {
          if (!WRITES.has(signature)) return chain.answer(signature);
          chain.sent.push(signature);
          return { hash: `0x${"ab".repeat(32)}`, wait: async (): Promise<unknown> => ({ gasUsed: 100_000n }) };
        };
        call.staticCall = async (): Promise<unknown> => (WRITES.has(signature) ? undefined : chain.answer(signature));
        return call;
      },
    } as unknown as Contract;
  }

  provider(): JsonRpcProvider {
    const chain = this;
    return { getBlock: async (): Promise<unknown> => ({ timestamp: chain.now }) } as unknown as JsonRpcProvider;
  }

  decryptor(): Decryptor {
    return { publicDecrypt: async (): Promise<{ values: bigint[]; proof: string }> => ({ values: [], proof: "0x" }) };
  }

  private answer(signature: string): unknown {
    this.reads += 1;
    switch (signature) {
      case "currentPeriod":
        return BigInt(this.period);
      case "closableDraw":
        return BigInt(this.closableDraw);
      case "closeDeadline":
        return BigInt(this.now + 3600);
      case "saverCount":
        return 0n;
      case "publishedCarry":
        return [`0x${"11".repeat(32)}`, 1n, false];
      case "drawOf":
        return DRAW_FIELDS.map((field) => (field === "prize" || field === "offered" ? [] : 0n));
      case "finalized":
        return false;
      case "windowEndsAt":
        return BigInt(this.now + 3600);
      default:
        throw new Error(`the stub chain was asked for ${signature}, which an idle pool never answers`);
    }
  }
}

function config(): KeeperConfig {
  return {
    name: "usdc",
    rpcUrl: "http://stub",
    chainId: 11155111,
    accountIndex: 1,
    keeperAddress: `0x${"cd".repeat(20)}`,
    symbol: "cUSDC",
    decimals: 6,
    vault: `0x${"01".repeat(20)}`,
    pool: `0x${"02".repeat(20)}`,
    source: null,
    pollMs: POLL,
    idleMs: IDLE,
    nearMs: NEAR,
    batchSize: 4,
    lookbackDraws: 4,
    scanFrom: 0,
    confirmations: 1,
    maxFeePerGas: null,
    maxPriorityFeePerGas: null,
    gasLimit: null,
    dryRun: false,
    relayer: { attempts: 1, baseDelayMs: 1, maxDelayMs: 1, timeoutMs: 1 },
  };
}

/** A keeper one hour into period 3 of a six-hour pool, which is as far from a boundary as it gets.
 *  The clock the resting pass reads is the machine's, so the period is placed around it. */
function idleKeeper(chain: IdleChain): Keeper {
  const fields = new Map<string, number>();
  DRAW_FIELDS.forEach((name, position) => fields.set(name, position));
  return new Keeper(config(), chain.provider(), chain.contract(), chain.contract(), fields, chain.decryptor(), {
    firstPeriodAt: chain.now - 2 * SIX_HOURS - 3600,
    periodLength: SIX_HOURS,
  });
}

async function quietly(run: () => Promise<void>): Promise<string> {
  const stdout = process.stdout.write.bind(process.stdout);
  let out = "";
  process.stdout.write = ((text: string): boolean => {
    out += text;
    return true;
  }) as typeof process.stdout.write;
  try {
    await run();
  } finally {
    process.stdout.write = stdout;
  }
  return out;
}

function idleChain(): IdleChain {
  return new IdleChain(3, Math.floor(Date.now() / 1000));
}

test("once a pass has found nothing, the next one asks two questions instead of a full read", async () => {
  const chain = idleChain();
  const keeper = idleKeeper(chain);

  const first = await quietly(() => keeper.tick());
  assert.match(first, /nothing to do: period 3/);
  const full = chain.reads;
  assert.ok(full > 2, `the first pass after boot reads the whole state, it read ${full}`);

  const second = await quietly(() => keeper.tick());
  assert.equal(chain.reads - full, 2, "a resting pass reads the period and the closable draw, nothing else");
  assert.match(second, /resting: period 3, next look in 600s/);
});

test("a period that turned over sends the keeper back to the full pass", async () => {
  const chain = idleChain();
  const keeper = idleKeeper(chain);
  await quietly(() => keeper.tick());
  const full = chain.reads;

  chain.period = 4;
  const log = await quietly(() => keeper.tick());
  assert.ok(chain.reads - full > 2, `the full pass should read more than the two questions, it read ${chain.reads - full}`);
  assert.match(log, /nothing to do: period 4/);
});

test("a draw waiting to be closed sends the keeper back to the full pass", async () => {
  const chain = idleChain();
  const keeper = idleKeeper(chain);
  await quietly(() => keeper.tick());
  const full = chain.reads;

  chain.closableDraw = 1;
  await quietly(() => keeper.tick());
  assert.ok(chain.reads - full > 2, `the full pass should read more than the two questions, it read ${chain.reads - full}`);
  assert.deepEqual(chain.sent, ["closeDraw(uint32)"], "resting must never swallow a draw that is ready to close");
});
