// Covers the number formatting in the log lines and the pool name each line carries, so an amount
// a founder reads is the amount the chain holds and seven keepers in one terminal can be told
// apart. Does not cover where the decimals and the symbol come from, which is the config test.
import assert from "node:assert/strict";
import { test } from "node:test";
import { amount, decorate, group, gwei, units, useName } from "../src/log.js";

test("an amount defaults to confidential USDC, six decimals read as dollars and cents", () => {
  assert.equal(amount(0n), "0.00 cUSDC");
  assert.equal(amount(1_240_000n), "1.24 cUSDC");
  assert.equal(amount(12_400_000n), "12.40 cUSDC");
  assert.equal(amount(400_000n), "0.40 cUSDC");
  assert.equal(amount(9_999n), "0.00 cUSDC");
  assert.equal(amount(-2_500_000n), "-2.50 cUSDC");
});

test("a pool with different decimals and a different symbol formats in its own units", () => {
  assert.equal(amount(1_240_000_000n, 9, "cWETH"), "1.24 cWETH");
  assert.equal(amount(12_345n, 4, "ctGBP"), "1.23 ctGBP");
  assert.equal(amount(7n, 0, "cXAUt"), "7 cXAUt");
  assert.equal(amount(75n, 1, "cXAUt"), "7.5 cXAUt");
});

test("the number and the symbol can be taken apart, which is how a prize list prints", () => {
  assert.equal(units(12_400_000n), "12.40");
  assert.equal([2_100_000n, 400_000n].map((value) => units(value, 6)).join(" / "), "2.10 / 0.40");
});

test("a large balance keeps every unit, past what a double can hold", () => {
  assert.equal(amount(9_007_199_254_740_993_000_000n), "9,007,199,254,740,993.00 cUSDC");
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

test("every line carries the pool name, and no name means the plain line", () => {
  try {
    useName("weth");
    assert.match(decorate("closed draw 41"), /^\d\d:\d\d:\d\d \[weth\] closed draw 41$/);
    useName("");
    assert.match(decorate("closed draw 41"), /^\d\d:\d\d:\d\d closed draw 41$/);
  } finally {
    useName("");
  }
});
