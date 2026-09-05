// Covers a whole tick driven against a stub chain: the two phases, what the keeper re-reads
// between them, and what a failure prints. The stub answers the same calls the real contracts do
// and records every transaction in order, so the assertions are about ordering and call counts.
// Does not cover the relayer, gas pricing, the ABI boot checks, or anything the contracts do.
import assert from "node:assert/strict";
import { test } from "node:test";
import type { Contract, JsonRpcProvider } from "ethers";
import type { KeeperConfig } from "../src/config.js";
import { Keeper } from "../src/keeper.js";
import { DrawStatus } from "../src/plan.js";
import type { Decryptor } from "../src/relayer.js";

const HOUR = 3600;
const NOW = 4 * HOUR + 60;
const HANDLE = `0x${"11".repeat(32)}`;

// The real map comes from the compiled ABI at boot. Here it is written out, so the stub's rows and
// the keeper's field lookup agree the same way the deployed struct makes them agree.
const DRAW_FIELDS = ["status", "offered", "prize", "seedHandle", "scaleHandle", "nonEmptyHandle", "harvestHandle"];

type Args = readonly unknown[];

interface Row {
  readonly status: DrawStatus;
  readonly prize: readonly bigint[];
}

interface ChainState {
  readonly period: number;
  readonly closableDraw: number;
  readonly closeDeadline: number;
  readonly saverCount: number;
  readonly draws: ReadonlyMap<number, Row>;
  /** Tiers whose carry is pending at the start of the tick. */
  readonly pending: readonly number[];
  /** Tiers whose carry a finalizeDraw makes pending, which is what the vault does on chain. */
  readonly publishedByFinalize: readonly number[];
}

const WRITES = new Set(["finalizeDraw", "reconcile", "closeDraw(uint32)", "awardDraw", "evaluate"]);

class StubChain {
  readonly sent: { readonly signature: string; readonly args: Args }[] = [];
  readonly reads = new Map<string, number>();
  private readonly pending: Set<number>;
  private readonly state: ChainState;
  /** Signature to fail on, with the error the endpoint would have thrown. */
  private readonly failure: { readonly signature: string; readonly error: unknown } | null;

  constructor(state: ChainState, failure: { readonly signature: string; readonly error: unknown } | null = null) {
    this.state = state;
    this.pending = new Set(state.pending);
    this.failure = failure;
  }

  contract(): Contract {
    const chain = this;
    return {
      interface: { parseError: (): null => null },
      getFunction(signature: string) {
        const call = async (...args: Args): Promise<unknown> => {
          if (chain.failure !== null && chain.failure.signature === signature) throw chain.failure.error;
          if (!WRITES.has(signature)) return chain.answer(signature, args);
          chain.apply(signature, args);
          return { hash: `0x${"ab".repeat(32)}`, wait: async (): Promise<unknown> => ({ gasUsed: 100_000n }) };
        };
        call.staticCall = async (...args: Args): Promise<unknown> => {
          if (chain.failure !== null && chain.failure.signature === signature) throw chain.failure.error;
          return WRITES.has(signature) ? undefined : chain.answer(signature, args);
        };
        return call;
      },
    } as unknown as Contract;
  }

  provider(): JsonRpcProvider {
    return { getBlock: async (): Promise<unknown> => ({ timestamp: NOW }) } as unknown as JsonRpcProvider;
  }

  decryptor(): Decryptor {
    return { publicDecrypt: async (): Promise<{ values: bigint[]; proof: string }> => ({ values: [1_000_000n, 2n, 1n, 3_000_000n], proof: "0x" }) };
  }

  private answer(signature: string, args: Args): unknown {
    this.reads.set(signature, (this.reads.get(signature) ?? 0) + 1);
    switch (signature) {
      case "currentPeriod":
        return BigInt(this.state.period);
      case "closableDraw":
        return BigInt(this.state.closableDraw);
      case "closeDeadline":
        return BigInt(this.state.closeDeadline);
      case "saverCount":
        return BigInt(this.state.saverCount);
      case "drawOf":
        return this.drawRow(Number(args[0]));
      case "finalized":
        return false;
      case "windowEndsAt":
        return BigInt((Number(args[0]) + 2) * HOUR);
      case "walkOf":
        return [0n, BigInt(this.state.saverCount)];
      case "cursorOf":
        return BigInt(this.state.saverCount);
      case "publishedCarry":
        return [HANDLE, 1n, this.pending.has(Number(args[0]))];
      default:
        throw new Error(`the stub chain was asked for ${signature}, which it does not answer`);
    }
  }

  private drawRow(drawId: number): unknown[] {
    const row = this.state.draws.get(drawId) ?? { status: DrawStatus.None, prize: [] };
    return DRAW_FIELDS.map((field) => {
      if (field === "status") return BigInt(row.status);
      if (field === "prize") return row.prize;
      if (field === "offered") return [0n, 0n, 0n];
      return HANDLE;
    });
  }

  private apply(signature: string, args: Args): void {
    this.sent.push({ signature, args });
    if (signature === "finalizeDraw") {
      for (const tier of this.state.publishedByFinalize) this.pending.add(tier);
    }
    if (signature === "reconcile") this.pending.delete(Number(args[0]));
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
    pollMs: 30_000,
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

function keeperOver(chain: StubChain): Keeper {
  const fields = new Map<string, number>();
  DRAW_FIELDS.forEach((name, position) => fields.set(name, position));
  return new Keeper(config(), chain.provider(), chain.contract(), chain.contract(), fields, chain.decryptor());
}

/** Runs a tick with the log captured, so the suite stays readable and the lines can be asserted. */
async function tickQuietly(keeper: Keeper): Promise<{ out: string; err: string }> {
  const stdout = process.stdout.write.bind(process.stdout);
  const stderr = process.stderr.write.bind(process.stderr);
  let out = "";
  let err = "";
  process.stdout.write = ((text: string): boolean => {
    out += text;
    return true;
  }) as typeof process.stdout.write;
  process.stderr.write = ((text: string): boolean => {
    err += text;
    return true;
  }) as typeof process.stderr.write;
  try {
    await keeper.tick();
  } finally {
    process.stdout.write = stdout;
    process.stderr.write = stderr;
  }
  return { out, err };
}

function lateDraw(): ChainState {
  return {
    period: 5,
    closableDraw: 3,
    closeDeadline: 6 * HOUR,
    saverCount: 4,
    draws: new Map([[1, { status: DrawStatus.Awarded, prize: [] as bigint[] }]]),
    pending: [],
    publishedByFinalize: [0, 2],
  };
}

test("a carry the finalize publishes is reconciled before the same pass closes the next draw", async () => {
  const chain = new StubChain(lateDraw());
  await tickQuietly(keeperOver(chain));

  const order = chain.sent.map((call) => call.signature);
  assert.deepEqual(order, ["finalizeDraw", "reconcile", "reconcile", "closeDraw(uint32)"]);
  assert.deepEqual(
    chain.sent.filter((call) => call.signature === "reconcile").map((call) => Number(call.args[0])),
    [0, 2],
    "both tiers the finalize published are booked back before the close fixes the prize sizes",
  );
});

test("the carries are read again after the finalizes, not only at the top of the tick", async () => {
  const chain = new StubChain(lateDraw());
  await tickQuietly(keeperOver(chain));
  // Three tiers at the opening read, three more after the finalize, then one confirming read
  // inside each of the two reconciles.
  assert.equal(chain.reads.get("publishedCarry"), 8);
});

test("a pass with nothing to finalize reads the carries once and closes on the opening state", async () => {
  const chain = new StubChain({ ...lateDraw(), draws: new Map(), publishedByFinalize: [] });
  await tickQuietly(keeperOver(chain));

  assert.deepEqual(
    chain.sent.map((call) => call.signature),
    ["closeDraw(uint32)"],
  );
  assert.equal(chain.reads.get("publishedCarry"), 3);
});

test("a carry already pending at the top of the tick is still reconciled before the close", async () => {
  const chain = new StubChain({ ...lateDraw(), draws: new Map(), publishedByFinalize: [], pending: [1] });
  await tickQuietly(keeperOver(chain));

  assert.deepEqual(
    chain.sent.map((call) => call.signature),
    ["reconcile", "closeDraw(uint32)"],
  );
});

test("a close that the endpoint refuses still leaves the finalize and the reconciles sent", async () => {
  const rateLimited = Object.assign(new Error("exceeded maximum retry limit"), {
    code: "SERVER_ERROR",
    shortMessage: "exceeded maximum retry limit",
    info: { responseStatus: "429 Too Many Requests" },
  });
  const chain = new StubChain(lateDraw(), { signature: "closeDraw(uint32)", error: rateLimited });
  const log = await tickQuietly(keeperOver(chain));

  assert.deepEqual(
    chain.sent.map((call) => call.signature),
    ["finalizeDraw", "reconcile", "reconcile"],
  );
  assert.match(log.err, /closed draw 3 was refused before sending: exceeded maximum retry limit/);
  assert.match(log.err, /SERVER_ERROR, 429 Too Many Requests/);
});

test("a read that fails on the endpoint says so instead of blaming the contract", async () => {
  const rateLimited = Object.assign(new Error("exceeded maximum retry limit"), {
    code: "SERVER_ERROR",
    shortMessage: "exceeded maximum retry limit",
    info: { responseStatus: "429 Too Many Requests" },
  });
  const chain = new StubChain(lateDraw(), { signature: "currentPeriod", error: rateLimited });
  await assert.rejects(() => keeperOver(chain).tick(), /exceeded maximum retry limit/);
});
