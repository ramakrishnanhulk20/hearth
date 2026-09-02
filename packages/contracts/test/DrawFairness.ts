import { FhevmType } from "@fhevm/hardhat-plugin";
import type { HardhatEthersSigner } from "@nomicfoundation/hardhat-ethers/signers";
import { expect } from "chai";
import { ethers, fhevm } from "hardhat";
import type { ConfidentialUSDC, LanternPool, TestUSDC } from "../types";

describe("draw fairness", () => {

  const STAKES = [1, 1, 1, 1, 6].map((n) => BigInt(n) * 1_000_000n);
  const POOL = STAKES.reduce((a, b) => a + b, 0n);
  const PRIZE = 1_000_000n;
  const DRAWS = 120;

  it("wins land in proportion to stake, and exactly one per draw", async function () {
    this.timeout(600_000);

    const signers = await ethers.getSigners();
    const admin = signers[0];
    const players: HardhatEthersSigner[] = signers.slice(1, 1 + STAKES.length);

    const usdc = (await (await ethers.getContractFactory("TestUSDC")).deploy()) as unknown as TestUSDC;
    const cusdc = (await (
      await ethers.getContractFactory("ConfidentialUSDC")
    ).deploy(await usdc.getAddress())) as unknown as ConfidentialUSDC;
    const cusdcAddress = await cusdc.getAddress();

    const pool = (await (
      await ethers.getContractFactory("LanternPool")
    ).deploy(cusdcAddress, await usdc.getAddress(), PRIZE, 0, admin.address)) as unknown as LanternPool;
    const poolAddress = await pool.getAddress();

    const funding = PRIZE * BigInt(DRAWS);
    await (await usdc.connect(admin).claim()).wait();
    await (await usdc.connect(admin).approve(poolAddress, funding)).wait();
    await (await pool.connect(admin).fundReserve(funding)).wait();

    for (let i = 0; i < players.length; i++) {
      const who = players[i];
      await (await usdc.connect(who).claim()).wait();
      await (await usdc.connect(who).approve(cusdcAddress, STAKES[i])).wait();
      await (await cusdc.connect(who).wrap(who.address, STAKES[i])).wait();

      const input = await fhevm.createEncryptedInput(cusdcAddress, who.address).add64(STAKES[i]).encrypt();
      await (
        await cusdc
          .connect(who)
          ["confidentialTransferAndCall(address,bytes32,bytes,bytes)"](
            poolAddress,
            input.handles[0],
            input.inputProof,
            "0x",
          )
      ).wait();
    }

    for (let draw = 0; draw < DRAWS; draw++) {
      await (await pool.openDraw()).wait();
      while ((await pool.phase()) === 1n) {
        await (await pool.scanChunk(await pool.maxChunk())).wait();
      }
    }

    const wins: number[] = [];
    for (const who of players) {
      const handle = await pool.confidentialWinningsOf(who.address);
      const won = await fhevm.userDecryptEuint(FhevmType.euint64, handle, poolAddress, who);
      wins.push(Number(won / PRIZE));
    }

    const houseHandle = await pool.confidentialWinningsOf(poolAddress);
    const published = await fhevm.publicDecrypt([houseHandle]);
    const houseValue = Object.values(published.clearValues)[0] as bigint;
    const houseWon = Number(houseValue / PRIZE);

    console.log(`\n  ${DRAWS} draws over an encrypted pool of ${POOL / 1_000_000n} tokens:`);
    for (let i = 0; i < players.length; i++) {
      const expected = (Number(STAKES[i]) / Number(POOL)) * 100;
      const actual = (wins[i] / DRAWS) * 100;
      console.log(
        `    stake ${String(STAKES[i] / 1_000_000n).padStart(2)}/${POOL / 1_000_000n}` +
          `  expected ${expected.toFixed(0).padStart(2)}%` +
          `  won ${String(wins[i]).padStart(3)}/${DRAWS} = ${actual.toFixed(0).padStart(2)}%`,
      );
    }
    console.log(`    house ticket (1 unit of ${POOL}): won ${houseWon}\n`);

    expect(wins.reduce((a, b) => a + b, 0) + houseWon, "one winner per draw").to.equal(DRAWS);

    expect(wins[4], "the large stake wins most often").to.be.greaterThan(Math.max(...wins.slice(0, 4)));

    for (let i = 0; i < 4; i++) {
      expect(wins[i], `stake ${i} is not starved`).to.be.greaterThan(2);
      expect(wins[i], `stake ${i} is not favoured`).to.be.lessThan(30);
    }
  });
});
