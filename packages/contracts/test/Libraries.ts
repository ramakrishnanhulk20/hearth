// Covers the period arithmetic the vault and the pool both count draws with. Does not cover how they
// use it, and does not cover timestamps beyond the range a uint32 period can hold.
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
});
