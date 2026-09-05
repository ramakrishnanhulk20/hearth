import { NextResponse } from "next/server";
import { parseAbiItem } from "viem";
import { findPool } from "@/lib/chain/pools";
import { serverClient } from "@/lib/chain/read";

/**
 * The draw lifecycle as it happened on chain: which transaction closed, awarded, finalized or
 * reconciled each draw, and how long ago the newest of them landed.
 *
 * It runs on the server because a log query over a day of Sepolia blocks is far past what the
 * free public node the browser talks to will answer. The browser reads state; this reads history.
 *
 * The pool is a query parameter and not a default, because every deployment has its own vault and
 * its own prize pool and their logs have nothing to do with each other.
 */

// The pool comes in on the query string, so there is nothing here that could be rendered once
// and served to everybody.
export const dynamic = "force-dynamic";

/** About ten hours of Sepolia blocks at twelve seconds each, so several full draw windows. */
const LOOKBACK_BLOCKS = 3_000n;

const EVENTS = {
  DrawClosed: parseAbiItem("event DrawClosed(uint32 indexed drawId, bytes32 seedHandle, bytes32 scaleHandle, bytes32 nonEmptyHandle, bytes32 harvestHandle, uint64[3] prize, uint64[3] offered)"),
  DrawAwarded: parseAbiItem("event DrawAwarded(uint32 indexed drawId, uint64 seed, uint8 scaleBits, uint64 harvested)"),
  DrawEmpty: parseAbiItem("event DrawEmpty(uint32 indexed drawId, uint64 harvested)"),
  DrawSkipped: parseAbiItem("event DrawSkipped(uint32 indexed drawId, uint64 harvested)"),
  TierReconciled: parseAbiItem("event TierReconciled(uint32 indexed drawId, uint8 indexed tier, uint64 carry)"),
  DrawFinalized: parseAbiItem("event DrawFinalized(uint32 indexed drawId, bytes32 unfunded)"),
} as const;

export type ActivityEvent = {
  kind: keyof typeof EVENTS;
  drawId: number;
  tier: number | null;
  block: number;
  tx: string;
  /** The event's one number where it carries one: a tier's reconciled carry, or a harvest. */
  amount: string | null;
};

export type Activity = {
  block: number;
  now: number;
  events: ActivityEvent[];
  /** The newest lifecycle transaction, which is what "is anybody advancing the draws" means here. */
  lastKeeper: { block: number; tx: string; from: string | null; kind: string; secondsAgo: number } | null;
};

export async function GET(request: Request) {
  const slug = new URL(request.url).searchParams.get("pool") ?? "";
  const entry = findPool(slug);
  if (entry === null) {
    return NextResponse.json({ error: `There is no pool called "${slug}".` }, { status: 404 });
  }
  if (entry.status !== "open") {
    return NextResponse.json({ error: `${entry.symbol} has no pool, so it has no draw history.` }, { status: 404 });
  }
  const { vault, pool } = entry;

  try {
    const latest = await serverClient.getBlock({ blockTag: "latest" });
    const fromBlock = latest.number > LOOKBACK_BLOCKS ? latest.number - LOOKBACK_BLOCKS : 0n;

    const [closed, awarded, empty, skipped, reconciled, finalized] = await Promise.all([
      serverClient.getLogs({ address: pool, event: EVENTS.DrawClosed, fromBlock, toBlock: latest.number }),
      serverClient.getLogs({ address: pool, event: EVENTS.DrawAwarded, fromBlock, toBlock: latest.number }),
      serverClient.getLogs({ address: pool, event: EVENTS.DrawEmpty, fromBlock, toBlock: latest.number }),
      serverClient.getLogs({ address: pool, event: EVENTS.DrawSkipped, fromBlock, toBlock: latest.number }),
      serverClient.getLogs({ address: pool, event: EVENTS.TierReconciled, fromBlock, toBlock: latest.number }),
      serverClient.getLogs({ address: vault, event: EVENTS.DrawFinalized, fromBlock, toBlock: latest.number }),
    ]);

    const events: ActivityEvent[] = [];
    const collect = (kind: keyof typeof EVENTS, logs: { args: Record<string, unknown>; blockNumber: bigint | null; transactionHash: string | null }[]) => {
      for (const log of logs) {
        if (log.blockNumber === null || log.transactionHash === null) continue;
        const drawId = log.args["drawId"];
        const tier = log.args["tier"];
        const amount = log.args["carry"] ?? log.args["harvested"];
        events.push({
          kind,
          drawId: Number(drawId ?? 0),
          tier: tier === undefined ? null : Number(tier),
          block: Number(log.blockNumber),
          tx: log.transactionHash,
          amount: typeof amount === "bigint" ? amount.toString() : null,
        });
      }
    };

    collect("DrawClosed", closed as never);
    collect("DrawAwarded", awarded as never);
    collect("DrawEmpty", empty as never);
    collect("DrawSkipped", skipped as never);
    collect("TierReconciled", reconciled as never);
    collect("DrawFinalized", finalized as never);
    events.sort((a, b) => b.block - a.block);

    const newest = events[0];
    let lastKeeper: Activity["lastKeeper"] = null;
    if (newest) {
      const [block, transaction] = await Promise.all([
        serverClient.getBlock({ blockNumber: BigInt(newest.block) }),
        serverClient.getTransaction({ hash: newest.tx as `0x${string}` }).catch(() => null),
      ]);
      lastKeeper = {
        block: newest.block,
        tx: newest.tx,
        from: transaction?.from ?? null,
        kind: newest.kind,
        secondsAgo: Number(latest.timestamp - block.timestamp),
      };
    }

    const body: Activity = {
      block: Number(latest.number),
      now: Number(latest.timestamp),
      events: events.slice(0, 120),
      lastKeeper,
    };
    return NextResponse.json(body);
  } catch (error) {
    const detail = error instanceof Error ? error.message.split("\n")[0] : String(error);
    return NextResponse.json({ error: `Could not read the chain: ${detail}` }, { status: 502 });
  }
}
