import { FhevmType } from "@fhevm/hardhat-plugin";
import type { HardhatEthersSigner } from "@nomicfoundation/hardhat-ethers/signers";
import { expect } from "chai";
import { ethers, fhevm } from "hardhat";
import type { ConfidentialUSDC, LanternPool, TestUSDC } from "../types";

const usd = (whole: number): bigint => BigInt(whole) * 1_000_000n;

const PRIZE = usd(500);
const INTERVAL = 60n;

describe("LanternPool", () => {
  let usdc: TestUSDC;
  let cusdc: ConfidentialUSDC;
  let pool: LanternPool;
  let cusdcAddress: string;
  let poolAddress: string;

  let admin: HardhatEthersSigner;
  let alice: HardhatEthersSigner;
  let bob: HardhatEthersSigner;
  let carol: HardhatEthersSigner;
  let stranger: HardhatEthersSigner;

  beforeEach(async () => {
    [admin, alice, bob, carol, stranger] = await ethers.getSigners();

    usdc = (await (await ethers.getContractFactory("TestUSDC")).deploy()) as unknown as TestUSDC;
    cusdc = (await (
      await ethers.getContractFactory("ConfidentialUSDC")
    ).deploy(await usdc.getAddress())) as unknown as ConfidentialUSDC;
    cusdcAddress = await cusdc.getAddress();

    pool = (await (
      await ethers.getContractFactory("LanternPool")
    ).deploy(cusdcAddress, await usdc.getAddress(), PRIZE, INTERVAL, admin.address)) as unknown as LanternPool;
    poolAddress = await pool.getAddress();
  });

  async function wrapFor(who: HardhatEthersSigner, amount: bigint) {
    await (await usdc.connect(who).claim()).wait();
    await (await usdc.connect(who).approve(cusdcAddress, amount)).wait();
    await (await cusdc.connect(who).wrap(who.address, amount)).wait();
  }

  async function deposit(who: HardhatEthersSigner, amount: bigint) {
    const input = await fhevm.createEncryptedInput(cusdcAddress, who.address).add64(amount).encrypt();
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

  async function fundReserve(amount: bigint) {
    await (await usdc.connect(admin).claim()).wait();
    await (await usdc.connect(admin).approve(poolAddress, amount)).wait();
    await (await pool.connect(admin).fundReserve(amount)).wait();
  }

  const principalOf = (who: HardhatEthersSigner) =>
    pool
      .confidentialBalanceOf(who.address)
      .then((handle) => fhevm.userDecryptEuint(FhevmType.euint64, handle, poolAddress, who));

  const winningsOf = (who: HardhatEthersSigner) =>
    pool
      .confidentialWinningsOf(who.address)
      .then((handle) => fhevm.userDecryptEuint(FhevmType.euint64, handle, poolAddress, who));

  async function winningsOfEach(players: HardhatEthersSigner[]): Promise<bigint[]> {
    const out: bigint[] = [];
    for (const who of players) out.push(await winningsOf(who));
    return out;
  }

  async function runDraw() {
    await (await pool.openDraw()).wait();
    while ((await pool.phase()) === 1n) {
      await (await pool.scanChunk(await pool.maxChunk())).wait();
    }
  }

  describe("depositing", () => {
    it("credits the depositor, and only the depositor can read the amount", async () => {
      await wrapFor(alice, usd(1_000));
      await deposit(alice, usd(400));

      expect(await principalOf(alice)).to.equal(usd(400));

      const handle = await pool.confidentialBalanceOf(alice.address);
      await expect(fhevm.userDecryptEuint(FhevmType.euint64, handle, poolAddress, stranger)).to.be.rejected;
    });

    it("adds to an existing balance rather than replacing it", async () => {
      await wrapFor(alice, usd(1_000));
      await deposit(alice, usd(400));
      await deposit(alice, usd(250));

      expect(await principalOf(alice)).to.equal(usd(650));
    });

    it("registers each depositor exactly once, behind the pool's own house ticket", async () => {
      await wrapFor(alice, usd(1_000));
      await deposit(alice, usd(100));
      await deposit(alice, usd(100));
      await wrapFor(bob, usd(1_000));
      await deposit(bob, usd(100));

      expect(await pool.depositorCount()).to.equal(3n);
      expect(await pool.depositorAt(0)).to.equal(poolAddress);
      expect(await pool.depositorAt(1)).to.equal(alice.address);
      expect(await pool.depositorAt(2)).to.equal(bob.address);
    });

    it("credits nothing when the depositor cannot cover the amount", async () => {
      await wrapFor(alice, usd(100));
      await deposit(alice, usd(900));

      expect(await principalOf(alice)).to.equal(0n);
    });
  });

  describe("withdrawing", () => {
    it("returns principal in full, at any time", async () => {
      await wrapFor(alice, usd(1_000));
      await deposit(alice, usd(600));

      const input = await fhevm.createEncryptedInput(poolAddress, alice.address).add64(usd(600)).encrypt();
      await (await pool.connect(alice).withdraw(input.handles[0], input.inputProof)).wait();

      expect(await principalOf(alice)).to.equal(0n);
      const wallet = await cusdc
        .confidentialBalanceOf(alice.address)
        .then((handle) => fhevm.userDecryptEuint(FhevmType.euint64, handle, cusdcAddress, alice));
      expect(wallet).to.equal(usd(1_000));
    });

    it("clamps an oversized request instead of reverting, so a balance cannot be probed", async () => {
      await wrapFor(alice, usd(1_000));
      await deposit(alice, usd(300));

      const input = await fhevm.createEncryptedInput(poolAddress, alice.address).add64(usd(999_999)).encrypt();
      await expect(pool.connect(alice).withdraw(input.handles[0], input.inputProof)).to.not.be.reverted;

      expect(await principalOf(alice)).to.equal(0n);
    });
  });

  describe("the draw", () => {
    it("pays the jackpot to exactly one depositor and nothing to the rest", async () => {
      await fundReserve(usd(2_000));
      for (const who of [alice, bob, carol]) {
        await wrapFor(who, usd(1_000));
        await deposit(who, usd(500));
      }

      await runDraw();

      const won = await winningsOfEach([alice, bob, carol]);
      const winners = won.filter((amount) => amount > 0n);

      expect(winners.length, "exactly one winner").to.equal(1);
      expect(winners[0], "who receives the whole jackpot").to.equal(PRIZE);
      expect(won.reduce((a, b) => a + b, 0n)).to.equal(PRIZE);
    });

    it("moves the reserve into the jackpot and no further", async () => {
      await fundReserve(usd(2_000));
      await wrapFor(alice, usd(1_000));
      await deposit(alice, usd(500));

      await runDraw();

      expect(await pool.reserve()).to.equal(usd(1_500));
      expect(await pool.jackpot()).to.equal(PRIZE);
      expect(await pool.drawId()).to.equal(1n);
      expect(await pool.phase()).to.equal(0n);
    });

    it("refuses a second draw before the interval has passed", async () => {
      await fundReserve(usd(2_000));
      await wrapFor(alice, usd(1_000));
      await deposit(alice, usd(500));

      await runDraw();
      await expect(pool.openDraw()).to.be.revertedWithCustomError(pool, "TooSoon");
    });

    it("refuses to open a draw the reserve cannot pay for", async () => {
      await wrapFor(alice, usd(1_000));
      await deposit(alice, usd(500));

      await expect(pool.openDraw()).to.be.revertedWithCustomError(pool, "ReserveTooSmall");
    });

    it("keeps the odds a depositor had at open, even if they withdraw mid-draw", async () => {
      await fundReserve(usd(2_000));
      for (const who of [alice, bob, carol]) {
        await wrapFor(who, usd(1_000));
        await deposit(who, usd(500));
      }

      await (await pool.openDraw()).wait();
      expect(await pool.phase()).to.equal(1n);

      const input = await fhevm.createEncryptedInput(poolAddress, carol.address).add64(usd(500)).encrypt();
      await (await pool.connect(carol).withdraw(input.handles[0], input.inputProof)).wait();
      expect(await principalOf(carol)).to.equal(0n);

      while ((await pool.phase()) === 1n) {
        await (await pool.scanChunk(await pool.maxChunk())).wait();
      }

      const won = await winningsOfEach([alice, bob, carol]);
      expect(won.filter((amount) => amount > 0n).length).to.equal(1);
      expect(won.reduce((a, b) => a + b, 0n)).to.equal(PRIZE);
    });
  });

  describe("claiming", () => {
    it("pays the winner and leaves everyone else exactly where they were", async () => {
      await fundReserve(usd(2_000));
      const players = [alice, bob, carol];
      for (const who of players) {
        await wrapFor(who, usd(1_000));
        await deposit(who, usd(500));
      }

      await runDraw();

      const before = await winningsOfEach(players);
      for (const who of players) {
        await (await pool.connect(who).claim()).wait();
      }

      for (let i = 0; i < players.length; i++) {
        expect(await winningsOf(players[i]), "winnings are cleared by claiming").to.equal(0n);

        const wallet = await cusdc
          .confidentialBalanceOf(players[i].address)
          .then((handle) => fhevm.userDecryptEuint(FhevmType.euint64, handle, cusdcAddress, players[i]));
        expect(wallet, "wallet grew by exactly what was won").to.equal(usd(500) + before[i]);
      }
    });

    it("is safe to call having won nothing, which is what stops claiming being a tell", async () => {
      await wrapFor(alice, usd(1_000));
      await deposit(alice, usd(500));

      await expect(pool.connect(alice).claim()).to.not.be.reverted;
      expect(await winningsOf(alice)).to.equal(0n);
    });
  });
});
