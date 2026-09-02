// Covers the tick planner: which draws get closed, awarded, evaluated, finalized and reconciled
// from a synthetic chain state, and the order those actions come out in.
// Does not cover any RPC or relayer behaviour, gas caps, or what the contracts do once called.
import assert from "node:assert/strict";
import { test } from "node:test";
import type { DrawSnapshot, TickSnapshot } from "../src/plan.js";
import { DrawStatus, isSettled, nextScanFrom, planTick } from "../src/plan.js";

const HOUR = 3600;

function draw(drawId: number, over: Partial<DrawSnapshot> = {}): DrawSnapshot {
  return {
    drawId,
    status: DrawStatus.None,
    finalized: false,
    windowEndsAt: (drawId + 2) * HOUR,
    walkStart: 0,
    walkLength: 0,
    cursor: 0,
    ...over,
  };
}

function snapshot(over: Partial<TickSnapshot> = {}): TickSnapshot {
  return {
    now: 3 * HOUR + 60,
    period: 4,
    closableDraw: 0,
    closeDeadline: 0,
    draws: [],
    pendingCarries: [],
    saverCount: 0,
    batchSize: 4,
    ...over,
  };
}

test("an idle pool asks for nothing", () => {
  assert.deepEqual(planTick(snapshot()), []);
});

test("closes the draw the pool names, while the deadline is still ahead", () => {
  const plan = planTick(snapshot({ closableDraw: 3, closeDeadline: 4 * HOUR }));
  assert.deepEqual(plan, [{ kind: "close", drawId: 3 }]);
});

test("does not close a draw whose deadline has passed", () => {
  const plan = planTick(snapshot({ now: 5 * HOUR, closableDraw: 3, closeDeadline: 4 * HOUR }));
  assert.deepEqual(plan, []);
});

test("awards every closed draw, oldest first", () => {
  const plan = planTick(
    snapshot({ period: 5, draws: [draw(3, { status: DrawStatus.Closed }), draw(2, { status: DrawStatus.Closed })] }),
  );
  assert.deepEqual(plan, [
    { kind: "award", drawId: 2 },
    { kind: "award", drawId: 3 },
  ]);
});

test("evaluates an awarded draw in batches until the walk is finished", () => {
  const open = draw(3, { status: DrawStatus.Awarded, walkLength: 10, cursor: 2, windowEndsAt: 9 * HOUR });
  const plan = planTick(snapshot({ draws: [open], saverCount: 10 }));
  assert.deepEqual(plan, [{ kind: "evaluate", drawId: 3, count: 4, done: 2, total: 10 }]);
});

test("shrinks the last batch to what the walk has left", () => {
  const open = draw(3, { status: DrawStatus.Awarded, walkLength: 10, cursor: 9, windowEndsAt: 9 * HOUR });
  const plan = planTick(snapshot({ draws: [open], saverCount: 10 }));
  assert.deepEqual(plan, [{ kind: "evaluate", drawId: 3, count: 1, done: 9, total: 10 }]);
});

test("uses the current saver list for a walk that has not started yet", () => {
  const open = draw(3, { status: DrawStatus.Awarded, walkLength: 0, cursor: 0, windowEndsAt: 9 * HOUR });
  const plan = planTick(snapshot({ draws: [open], saverCount: 7, batchSize: 4 }));
  assert.deepEqual(plan, [{ kind: "evaluate", drawId: 3, count: 4, done: 0, total: 7 }]);
});

test("asks for no evaluation once the cursor has reached the end of the walk", () => {
  const done = draw(3, { status: DrawStatus.Awarded, walkLength: 6, cursor: 6, windowEndsAt: 9 * HOUR });
  assert.deepEqual(planTick(snapshot({ draws: [done], saverCount: 6 })), []);
});

test("asks for no evaluation with no savers at all", () => {
  const open = draw(3, { status: DrawStatus.Awarded, walkLength: 0, cursor: 0, windowEndsAt: 9 * HOUR });
  assert.deepEqual(planTick(snapshot({ draws: [open], saverCount: 0 })), []);
});

test("finalizes an awarded draw once its window has ended, and stops evaluating it", () => {
  const past = draw(1, { status: DrawStatus.Awarded, walkLength: 6, cursor: 2, windowEndsAt: 3 * HOUR });
  const plan = planTick(snapshot({ now: 3 * HOUR + 1, period: 4, draws: [past], saverCount: 6 }));
  assert.deepEqual(plan, [{ kind: "finalize", drawId: 1 }]);
});

test("does not finalize a draw the award already settled", () => {
  const empty = draw(1, { status: DrawStatus.Empty, finalized: true, windowEndsAt: 3 * HOUR });
  const skipped = draw(2, { status: DrawStatus.Skipped, finalized: true, windowEndsAt: 4 * HOUR });
  assert.deepEqual(planTick(snapshot({ now: 9 * HOUR, period: 9, draws: [empty, skipped] })), []);
});

test("finalizes an empty draw the award left unsettled", () => {
  const empty = draw(1, { status: DrawStatus.Empty, finalized: false, windowEndsAt: 3 * HOUR });
  assert.deepEqual(planTick(snapshot({ now: 9 * HOUR, period: 9, draws: [empty] })), [
    { kind: "finalize", drawId: 1 },
  ]);
});

test("reconciles every tier the vault has published a carry for", () => {
  const plan = planTick(snapshot({ pendingCarries: [0, 2] }));
  assert.deepEqual(plan, [
    { kind: "reconcile", tier: 0 },
    { kind: "reconcile", tier: 2 },
  ]);
});

test("puts finalize and reconcile ahead of the close, so the money is offered again at once", () => {
  const past = draw(1, { status: DrawStatus.Awarded, walkLength: 4, cursor: 4, windowEndsAt: 3 * HOUR });
  const closed = draw(2, { status: DrawStatus.Closed });
  const open = draw(3, { status: DrawStatus.Awarded, walkLength: 4, cursor: 0, windowEndsAt: 9 * HOUR });
  const plan = planTick(
    snapshot({
      now: 4 * HOUR,
      period: 5,
      closableDraw: 4,
      closeDeadline: 6 * HOUR,
      draws: [past, closed, open],
      pendingCarries: [2],
      saverCount: 4,
    }),
  );
  assert.deepEqual(
    plan.map((action) => action.kind),
    ["finalize", "reconcile", "close", "award", "evaluate"],
  );
});

test("a draw nobody closed in time is settled and stops being read", () => {
  assert.equal(isSettled(draw(1), 4), true);
  assert.equal(isSettled(draw(3), 4), false);
  assert.equal(isSettled(draw(1, { status: DrawStatus.Closed }), 9), false);
  assert.equal(isSettled(draw(1, { status: DrawStatus.Awarded, finalized: false }), 9), false);
  assert.equal(isSettled(draw(1, { status: DrawStatus.Awarded, finalized: true }), 9), true);
});

test("the scan window moves past settled draws and stops at the first unsettled one", () => {
  const draws = [
    draw(1, { status: DrawStatus.Awarded, finalized: true }),
    draw(2, { status: DrawStatus.Empty, finalized: true }),
    draw(3, { status: DrawStatus.Closed }),
    draw(4, { status: DrawStatus.Awarded, finalized: true }),
  ];
  assert.equal(nextScanFrom(1, draws, 6), 3);
  assert.equal(nextScanFrom(4, draws, 6), 5);
});
