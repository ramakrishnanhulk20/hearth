/** Mirrors IHearthPrizePool.DrawStatus. The numbers are the on-chain enum. */
export enum DrawStatus {
  None = 0,
  Closed = 1,
  Awarded = 2,
  Empty = 3,
  Skipped = 4,
}

export const TIER_NAMES = ["grand", "mid", "frequent"] as const;
export const TIER_COUNT = TIER_NAMES.length;

export interface DrawSnapshot {
  readonly drawId: number;
  readonly status: DrawStatus;
  readonly finalized: boolean;
  /** Unix seconds at which periods p+1 and p+2 are over. */
  readonly windowEndsAt: number;
  readonly walkStart: number;
  /** Zero until the first evaluate call fixes the walk length for this draw. */
  readonly walkLength: number;
  readonly cursor: number;
}

export interface TickSnapshot {
  /** Chain time, taken from the latest block rather than the machine clock. */
  readonly now: number;
  readonly period: number;
  /** Pool's own answer to "which draw can be closed right now", zero for none. */
  readonly closableDraw: number;
  readonly closeDeadline: number;
  readonly draws: readonly DrawSnapshot[];
  readonly pendingCarries: readonly number[];
  readonly saverCount: number;
  readonly batchSize: number;
}

export type Action =
  | { readonly kind: "finalize"; readonly drawId: number }
  | { readonly kind: "reconcile"; readonly tier: number }
  | { readonly kind: "close"; readonly drawId: number }
  | { readonly kind: "award"; readonly drawId: number }
  | { readonly kind: "evaluate"; readonly drawId: number; readonly count: number; readonly done: number; readonly total: number };

export interface AwardHandles {
  readonly seedHandle: string;
  readonly scaleHandle: string;
  readonly nonEmptyHandle: string;
  readonly harvestHandle: string;
}

/** The order the pool verifies the award proof against. Changing it makes checkSignatures fail,
 * so it lives in one place and is asserted in the tests. */
export function awardHandles(draw: AwardHandles): string[] {
  return [draw.seedHandle, draw.scaleHandle, draw.nonEmptyHandle, draw.harvestHandle];
}

/** How many savers of this draw's walk are still unvisited. Before the first evaluate the walk
 * length is not fixed yet, so the current saver list is what the contract will use. */
export function remainingWalk(draw: DrawSnapshot, saverCount: number): number {
  const total = draw.walkLength > 0 ? draw.walkLength : saverCount;
  const left = total - draw.cursor;
  return left > 0 ? left : 0;
}

export function walkTotal(draw: DrawSnapshot, saverCount: number): number {
  return draw.walkLength > 0 ? draw.walkLength : saverCount;
}

export function needsFinalize(draw: DrawSnapshot, now: number): boolean {
  if (draw.finalized) return false;
  if (draw.status !== DrawStatus.Awarded && draw.status !== DrawStatus.Empty && draw.status !== DrawStatus.Skipped) {
    return false;
  }
  return now >= draw.windowEndsAt;
}

export function needsEvaluate(draw: DrawSnapshot, now: number, saverCount: number): boolean {
  if (draw.status !== DrawStatus.Awarded) return false;
  if (now >= draw.windowEndsAt) return false;
  return remainingWalk(draw, saverCount) > 0;
}

/**
 * A draw the keeper never has to look at again. Used to move the scan window forward so an old
 * draw is not re-read on every tick.
 */
export function isSettled(draw: DrawSnapshot, period: number): boolean {
  if (draw.status === DrawStatus.None) return draw.drawId + 2 < period;
  if (draw.status === DrawStatus.Closed) return false;
  return draw.finalized;
}

/**
 * Decides everything a tick will send, in the order it will send it.
 *
 * Finalize and reconcile run before the close, because a finalize folds a tier's unpaid prize
 * money into its carry and a reconcile turns that carry back into plaintext liquidity. Doing
 * both first means the money is offered again in the very next draw instead of sitting out one.
 */
export function planTick(snapshot: TickSnapshot): Action[] {
  const actions: Action[] = [];
  const draws = [...snapshot.draws].sort((a, b) => a.drawId - b.drawId);

  for (const draw of draws) {
    if (needsFinalize(draw, snapshot.now)) actions.push({ kind: "finalize", drawId: draw.drawId });
  }

  for (const tier of snapshot.pendingCarries) {
    actions.push({ kind: "reconcile", tier });
  }

  if (snapshot.closableDraw > 0 && snapshot.now < snapshot.closeDeadline) {
    actions.push({ kind: "close", drawId: snapshot.closableDraw });
  }

  for (const draw of draws) {
    if (draw.status === DrawStatus.Closed) actions.push({ kind: "award", drawId: draw.drawId });
  }

  for (const draw of draws) {
    if (!needsEvaluate(draw, snapshot.now, snapshot.saverCount)) continue;
    const total = walkTotal(draw, snapshot.saverCount);
    const left = remainingWalk(draw, snapshot.saverCount);
    const count = Math.min(snapshot.batchSize, left);
    actions.push({ kind: "evaluate", drawId: draw.drawId, count, done: draw.cursor, total });
  }

  return actions;
}

/** The lowest draw the next tick still has to read. */
export function nextScanFrom(scanFrom: number, draws: readonly DrawSnapshot[], period: number): number {
  const byId = new Map(draws.map((draw) => [draw.drawId, draw]));
  let cursor = scanFrom;
  for (;;) {
    const draw = byId.get(cursor);
    if (draw === undefined || !isSettled(draw, period)) return cursor;
    cursor += 1;
  }
}
