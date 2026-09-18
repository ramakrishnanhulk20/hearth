// Covers the two things that keep seven keepers off one endpoint's 50 requests a second limit: the
// offset each keeper adds to a wake aimed at a period boundary, and the pacer that stops one
// keeper's own pass from arriving in a single burst.
// Does not cover the rate-limit retry or what counts as a refusal: that is retry.test.ts. Does not
// cover the settings that carry these numbers: that is config.test.ts.
import assert from "node:assert/strict";
import { test } from "node:test";
import { defaultStaggerSeconds } from "../src/config.js";
import type { WakeSnapshot } from "../src/keeper.js";
import { nextWake } from "../src/keeper.js";
import { Pacer } from "../src/pace.js";

const SIX_HOURS = 6 * 3600;
const POLL = 30_000;
const IDLE = 600_000;
const NEAR = 120_000;
const FIRST_PERIOD_AT = 1_750_000_000;

/** The account index of every pool we run: the usdc pool on 1, the other six on 10 to 15. */
const INDEXES = [1, 10, 11, 12, 13, 14, 15];

function snapshot(staggerMs: number): WakeSnapshot {
  return {
    pending: false,
    period: 3,
    firstPeriodAt: FIRST_PERIOD_AT,
    periodLength: SIX_HOURS,
    pollMs: POLL,
    idleMs: IDLE,
    nearMs: NEAR,
    staggerMs,
  };
}

const END = FIRST_PERIOD_AT + 3 * SIX_HOURS;

test("the seven pools get seven different offsets without anyone configuring one", () => {
  assert.deepEqual(
    INDEXES.map(defaultStaggerSeconds),
    [4, 8, 12, 16, 20, 24, 28],
  );
  assert.equal(new Set(INDEXES.map(defaultStaggerSeconds)).size, INDEXES.length);
});

test("a keeper resting toward the near window adds its offset to the wake that opens it", () => {
  assert.equal(nextWake(snapshot(0), END - 300), 180_000, "the plain wake opens the window exactly");
  assert.equal(nextWake(snapshot(16_000), END - 300), 196_000);
});

test("inside the window the polls stay at the plain rate until the one that crosses the boundary", () => {
  assert.equal(nextWake(snapshot(16_000), END - 104), POLL, "a poll that stops short of the boundary is plain");
  assert.equal(nextWake(snapshot(16_000), END - 14), 30_000, "the crossing poll lands 16s after the boundary");
  assert.equal(nextWake(snapshot(28_000), END - 20), 48_000, "and a longer offset waits longer to land on its own second");
});

/** Walks the wakes the way the keeper would, and returns how many seconds after the boundary its
 *  first pass of the new period lands. */
function landingFrom(staggerMs: number, startedAt: number): number {
  let at = startedAt;
  for (let pass = 0; pass < 50 && at < END; pass++) at += nextWake(snapshot(staggerMs), at) / 1000;
  return at - END;
}

test("each of the seven keepers lands its first pass after the boundary on its own second", () => {
  for (const startedAt of [END - 6 * 3600 + 1, END - 3600, END - 300, END - 200]) {
    const landings = INDEXES.map((index) => landingFrom(defaultStaggerSeconds(index) * 1000, startedAt));
    assert.deepEqual(landings, [4, 8, 12, 16, 20, 24, 28], `started ${END - startedAt}s before the boundary`);
    assert.equal(new Set(landings).size, INDEXES.length, "no two keepers read the chain in the same second");
  }
});

test("the offset is never added to a pass that left work behind", () => {
  for (const now of [END - 3600, END - 300, END - 10, END, END + 60]) {
    assert.equal(nextWake({ ...snapshot(28_000), pending: true }, now), POLL, `pending at ${END - now}s should poll`);
  }
});

test("the offset is not added to the plain idle nap, nor once the boundary is behind us", () => {
  assert.equal(nextWake(snapshot(28_000), END - SIX_HOURS + 1), IDLE);
  assert.equal(nextWake(snapshot(28_000), END - 3600), IDLE);
  assert.equal(nextWake(snapshot(28_000), END + 60), POLL);
  assert.equal(nextWake(snapshot(28_000), END + SIX_HOURS), POLL);
});

test("the offset never delays a wake by more than itself", () => {
  const staggerMs = 28_000;
  for (let ahead = 0; ahead <= SIX_HOURS; ahead += 7) {
    const now = END - ahead;
    const staggered = nextWake(snapshot(staggerMs), now);
    const plain = nextWake(snapshot(0), now);
    assert.ok(staggered <= plain + staggerMs, `at ${ahead}s out: ${staggered} is more than ${plain} plus the offset`);
    assert.ok(staggered >= POLL, `at ${ahead}s out the wake dropped below the poll rate`);
  }
});

/** A clock that only moves when something sleeps, so the pacing can be asserted exactly. */
function fakeClock(): { now: () => number; sleep: (ms: number) => Promise<void>; waits: number[]; advance: (ms: number) => void } {
  let at = 1_000_000;
  const waits: number[] = [];
  return {
    now: () => at,
    sleep: async (ms: number): Promise<void> => {
      waits.push(ms);
      at += ms;
    },
    waits,
    advance: (ms: number) => {
      at += ms;
    },
  };
}

test("ten reads asked for at once leave one gap apart, in the order they were asked", async () => {
  const clock = fakeClock();
  const pacer = new Pacer(67, clock);
  const started: { at: number; which: number }[] = [];
  await Promise.all(
    Array.from({ length: 10 }, (_, which) =>
      pacer.run(async () => {
        started.push({ at: clock.now(), which });
      }),
    ),
  );

  assert.deepEqual(
    started.map((entry) => entry.which),
    [0, 1, 2, 3, 4, 5, 6, 7, 8, 9],
  );
  for (let i = 1; i < started.length; i++) {
    const gap = started[i]!.at - started[i - 1]!.at;
    assert.ok(gap >= 67, `read ${i} started ${gap}ms after the one before, which is inside the limit`);
  }
  assert.equal(started[9]!.at - started[0]!.at, 9 * 67, "ten reads at fifteen a second take a little over half a second");
});

test("a read after a long quiet spell is not held up at all", async () => {
  const clock = fakeClock();
  const pacer = new Pacer(67, clock);
  await pacer.run(async () => undefined);
  clock.advance(60_000);

  const at = clock.now();
  await pacer.run(async () => undefined);
  assert.equal(clock.now(), at, "nothing waited");
  assert.deepEqual(clock.waits, [], "and nothing slept");
});
