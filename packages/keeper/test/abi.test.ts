// Covers the boot-time check that the compiled contracts still carry the names the keeper calls,
// including the fields of the struct drawOf returns.
// Does not cover reading real artifacts from disk or anything that touches a network.
import assert from "node:assert/strict";
import { test } from "node:test";
import { Interface } from "ethers";
import { AbiError, checkAbis, structFieldIndex, structFieldNames } from "../src/abi.js";

const DRAW_STRUCT =
  "tuple(uint8 status, bytes32 seedHandle, bytes32 scaleHandle, bytes32 nonEmptyHandle, " +
  "bytes32 harvestHandle, uint64 seed, uint8 scaleBits, uint64 harvested, uint64[3] prize, uint64[3] offered)";

const POOL = [
  "function currentPeriod() view returns (uint32)",
  "function closableDraw() view returns (uint32)",
  "function closeDeadline(uint32 drawId) view returns (uint256)",
  "function closeDraw()",
  "function closeDraw(uint32 drawId)",
  "function awardDraw(uint32 drawId, uint64 seed, uint8 scaleCount, bool nonEmpty, uint64 harvested, bytes proof)",
  "function reconcile(uint8 tier, uint64 carry, bytes proof)",
  "function reconcileEvery(uint8 tier) view returns (uint16)",
  `function drawOf(uint32 drawId) view returns (${DRAW_STRUCT})`,
];

const VAULT = [
  "function evaluate(uint32 drawId, uint256 count)",
  "function cursorOf(uint32 drawId) view returns (uint256)",
  "function walkOf(uint32 drawId) view returns (uint256 start, uint256 length)",
  "function evaluatedCount(uint32 drawId) view returns (uint256)",
  "function finalizeDraw(uint32 drawId)",
  "function finalized(uint32 drawId) view returns (bool)",
  "function publishedCarry(uint8 tier) view returns (bytes32 handle, uint32 publishedAt, bool pending)",
  "function windowEndsAt(uint32 drawId) view returns (uint256)",
  "function saverCount() view returns (uint256)",
];

function without(abi: readonly string[], needle: string): string[] {
  return abi.filter((entry) => !entry.includes(needle));
}

test("the contracts this keeper was written against pass the check", () => {
  assert.doesNotThrow(() => checkAbis(POOL, VAULT));
});

test("a pool function that was renamed is named in the failure", () => {
  assert.throws(() => checkAbis(without(POOL, "awardDraw"), VAULT), (error: unknown) => {
    assert.ok(error instanceof AbiError);
    assert.match((error as Error).message, /HearthPrizePool has no function named awardDraw/);
    return true;
  });
});

test("a vault function that was renamed is named in the failure", () => {
  assert.throws(() => checkAbis(POOL, without(VAULT, "walkOf")), /HearthVault has no function named walkOf/);
});

test("losing the one argument closeDraw overload is caught, not left for a call to discover", () => {
  const noOverload = POOL.filter((entry) => !entry.includes("closeDraw(uint32 drawId)"));
  assert.throws(() => checkAbis(noOverload, VAULT), /HearthPrizePool has no function closeDraw\(uint32\)/);
});

test("a renamed field inside the draw struct is caught", () => {
  const renamed = POOL.map((entry) => entry.replace("bytes32 scaleHandle", "bytes32 scaleCountHandle"));
  assert.throws(
    () => checkAbis(renamed, VAULT),
    /HearthPrizePool.drawOf does not return a field named scaleHandle/,
  );
});

test("every mismatch is reported at once, so one pass fixes them all", () => {
  const broken = without(without(POOL, "awardDraw"), "reconcileEvery");
  assert.throws(() => checkAbis(broken, without(VAULT, "cursorOf")), (error: unknown) => {
    const message = (error as Error).message;
    assert.match(message, /awardDraw/);
    assert.match(message, /reconcileEvery/);
    assert.match(message, /cursorOf/);
    return true;
  });
});

test("the draw struct fields are read in declaration order", () => {
  assert.deepEqual(structFieldNames(POOL, "drawOf").slice(0, 5), [
    "status",
    "seedHandle",
    "scaleHandle",
    "nonEmptyHandle",
    "harvestHandle",
  ]);
});

test("a decoded draw hands back the value that belongs to each name", () => {
  const iface = new Interface(POOL);
  const handle = (byte: string): string => `0x${byte.repeat(64)}`;
  const encoded = iface.encodeFunctionResult("drawOf", [
    [2, handle("1"), handle("2"), handle("3"), handle("4"), 99n, 28, 3_600_000n, [1n, 2n, 3n], [4n, 5n, 6n]],
  ]);
  const decoded = iface.decodeFunctionResult("drawOf", encoded)[0] as unknown[];
  const index = structFieldIndex(POOL, "drawOf");
  const at = (name: string): unknown => decoded[index.get(name) ?? -1];

  assert.equal(at("status"), 2n);
  assert.equal(at("seedHandle"), handle("1"));
  assert.equal(at("scaleHandle"), handle("2"));
  assert.equal(at("nonEmptyHandle"), handle("3"));
  assert.equal(at("harvestHandle"), handle("4"));
  assert.equal(at("scaleBits"), 28n);
  assert.equal(at("harvested"), 3_600_000n);
  assert.deepEqual([...(at("prize") as bigint[])], [1n, 2n, 3n]);
});
