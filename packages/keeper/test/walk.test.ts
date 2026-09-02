// Covers the walk arithmetic the keeper uses to decide how many savers to evaluate next.
// Does not cover the vault's own walk, which starts at seed mod saverCount and skips savers with
// no history; the keeper only ever counts positions, never chooses which saver is next.
import assert from "node:assert/strict";
import { test } from "node:test";
import type { DrawSnapshot } from "../src/plan.js";
import { DrawStatus, needsEvaluate, remainingWalk, walkTotal } from "../src/plan.js";

function walking(over: Partial<DrawSnapshot>): DrawSnapshot {
  return {
    drawId: 7,
    status: DrawStatus.Awarded,
    finalized: false,
    windowEndsAt: 1_000,
    walkStart: 0,
    walkLength: 0,
    cursor: 0,
    ...over,
  };
}

test("a fixed walk counts down from its own length, not from the saver list", () => {
  const draw = walking({ walkLength: 5, cursor: 2 });
  assert.equal(walkTotal(draw, 99), 5);
  assert.equal(remainingWalk(draw, 99), 3);
});

test("a walk that has not started yet counts the savers registered now", () => {
  const draw = walking({ walkLength: 0, cursor: 0 });
  assert.equal(walkTotal(draw, 12), 12);
  assert.equal(remainingWalk(draw, 12), 12);
});

test("a finished walk has nothing left, even if savers joined afterwards", () => {
  const draw = walking({ walkLength: 5, cursor: 5 });
  assert.equal(remainingWalk(draw, 40), 0);
  assert.equal(needsEvaluate(draw, 500, 40), false);
});

test("a cursor past the end never reports negative work", () => {
  assert.equal(remainingWalk(walking({ walkLength: 3, cursor: 9 }), 3), 0);
});

test("only an awarded draw inside its window is worth evaluating", () => {
  const open = walking({ walkLength: 4, cursor: 0, windowEndsAt: 1_000 });
  assert.equal(needsEvaluate(open, 999, 4), true);
  assert.equal(needsEvaluate(open, 1_000, 4), false);
  assert.equal(needsEvaluate({ ...open, status: DrawStatus.Closed }, 999, 4), false);
  assert.equal(needsEvaluate({ ...open, status: DrawStatus.Empty }, 999, 4), false);
  assert.equal(needsEvaluate({ ...open, status: DrawStatus.Skipped }, 999, 4), false);
});

test("the walk covers every saver exactly once across batches", () => {
  const batch = 4;
  let cursor = 0;
  const length = 11;
  const sizes: number[] = [];
  while (cursor < length) {
    const draw = walking({ walkLength: length, cursor });
    const size = Math.min(batch, remainingWalk(draw, length));
    sizes.push(size);
    cursor += size;
  }
  assert.deepEqual(sizes, [4, 4, 3]);
  assert.equal(cursor, length);
});
