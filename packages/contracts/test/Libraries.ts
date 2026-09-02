// Covers the period arithmetic and the unbiased random draw. Does not cover how the pool uses
// them, and does not test statistical uniformity of the draw beyond range and determinism.
import { expect } from "chai";
import { ethers } from "hardhat";
import type { LibraryHarness } from "../types";

describe("libraries", () => {
  let lib: LibraryHarness;

  before(async () => {
    lib = (await (await ethers.getContractFactory("LibraryHarness")).deploy()) as unknown as LibraryHarness;
  });

  describe("Periods", () => {
    const FIRST = 1_000_000n;
    const LENGTH = 1_800n;

    it("counts periods from one, starting at the first timestamp", async () => {
      expect(await lib.periodOf(FIRST, FIRST, LENGTH)).to.equal(1);
      expect(await lib.periodOf(FIRST + LENGTH - 1n, FIRST, LENGTH)).to.equal(1);
      expect(await lib.periodOf(FIRST + LENGTH, FIRST, LENGTH)).to.equal(2);
      expect(await lib.periodOf(FIRST + 10n * LENGTH + 5n, FIRST, LENGTH)).to.equal(11);
    });

    it("puts anything before the first timestamp in period zero", async () => {
      expect(await lib.periodOf(0, FIRST, LENGTH)).to.equal(0);
      expect(await lib.periodOf(FIRST - 1n, FIRST, LENGTH)).to.equal(0);
    });

    it("bounds a period so that its end is the next period's start", async () => {
      expect(await lib.startOf(1, FIRST, LENGTH)).to.equal(FIRST);
      expect(await lib.endOf(1, FIRST, LENGTH)).to.equal(FIRST + LENGTH);
      expect(await lib.startOf(2, FIRST, LENGTH)).to.equal(await lib.endOf(1, FIRST, LENGTH));
      expect(await lib.endOf(7, FIRST, LENGTH)).to.equal(FIRST + 7n * LENGTH);
    });
  });

  describe("UniformRandom", () => {
    it("always lands inside the bound, for bounds that are not powers of two", async () => {
      for (const bound of [1n, 3n, 7n, 1_000n, 123_456_789n, (1n << 64n) - 1n]) {
        for (let i = 0; i < 12; i++) {
          const entropy = BigInt(ethers.keccak256(ethers.toUtf8Bytes(`seed-${bound}-${i}`)));
          const value = await lib.draw(entropy, bound);
          expect(value).to.be.lessThan(bound);
        }
      }
    });

    it("is deterministic for the same entropy and bound", async () => {
      const entropy = BigInt(ethers.keccak256(ethers.toUtf8Bytes("same")));
      expect(await lib.draw(entropy, 1_000_003n)).to.equal(await lib.draw(entropy, 1_000_003n));
    });

    it("rehashes entropy that falls in the truncated top bucket", async () => {
      // With bound 2^255 + 1 the rejected region is the whole lower half, so a small entropy
      // must be rehashed and cannot come back as itself.
      const bound = (1n << 255n) + 1n;
      const value = await lib.draw(5n, bound);
      expect(value).to.not.equal(5n);
      expect(value).to.be.lessThan(bound);
    });

    it("rejects a zero bound", async () => {
      await expect(lib.draw(1n, 0n)).to.be.revertedWithCustomError(lib, "ZeroBound");
    });
  });
});
