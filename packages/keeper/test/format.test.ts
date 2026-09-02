// Covers the number formatting in the log lines, so an amount a founder reads is the amount the
// chain holds. Does not cover the log lines themselves.
import assert from "node:assert/strict";
import { test } from "node:test";
import { group, gwei, usdc } from "../src/log.js";

test("confidential USDC reads as dollars and cents", () => {
  assert.equal(usdc(0n), "0.00");
  assert.equal(usdc(1_240_000n), "1.24");
  assert.equal(usdc(12_400_000n), "12.40");
  assert.equal(usdc(400_000n), "0.40");
  assert.equal(usdc(9_999n), "0.00");
  assert.equal(usdc(-2_500_000n), "-2.50");
});

test("a large balance keeps every unit, past what a double can hold", () => {
  assert.equal(usdc(9_007_199_254_740_993_000_000n), "9,007,199,254,740,993.00");
});

test("gas is grouped so a human can read it at a glance", () => {
  assert.equal(group(1_204_331n), "1,204,331");
  assert.equal(group(999n), "999");
  assert.equal(group(1_000n), "1,000");
  assert.equal(group(0), "0");
});

test("gas prices read in gwei", () => {
  assert.equal(gwei(1_000_000_000n), "1");
  assert.equal(gwei(12_500_000_000n), "12.50");
  assert.equal(gwei(0n), "0");
});
