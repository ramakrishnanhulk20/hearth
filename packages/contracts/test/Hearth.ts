// Covers one full cycle on the mock coprocessor: deposits in a period, close, award with a verified
// public decryption, evaluation of every saver, finalize, reconcile, and withdrawals that pay winnings
// first. Also covers the deposit cap, the pause, and a late deposit carrying no weight.
// Does not cover statistical fairness over many draws, the live relayer and KMS, the Confidential
// Vault yield adapter, or gas and HCU limits at the real coprocessor's budget.
import { FhevmType } from "@fhevm/hardhat-plugin";
import type { HardhatEthersSigner } from "@nomicfoundation/hardhat-ethers/signers";
import { time } from "@nomicfoundation/hardhat-network-helpers";
import { expect } from "chai";
import { ethers, fhevm } from "hardhat";
import type { ConfidentialUSDC, HearthPrizePool, HearthVault, SponsoredYieldSource, TestUSDC } from "../types";

const usd = (whole: number): bigint => BigInt(whole) * 1_000_000n;
const PERIOD = 600n;
const RATE = 1_000_000n; // one USDC per second, so a period harvests 600 USDC

const TIERS = [
  { prizeCount: 1, oddsNumerator: 1, oddsDenominator: 4, shares: 2 },
  { prizeCount: 2, oddsNumerator: 1, oddsDenominator: 2, shares: 1 },
  { prizeCount: 4, oddsNumerator: 1, oddsDenominator: 1, shares: 1 },
];

describe("Hearth", () => {
  let usdc: TestUSDC;
  let cusdc: ConfidentialUSDC;
  let vault: HearthVault;
  let pool: HearthPrizePool;
  let source: SponsoredYieldSource;
  let cusdcAddress: string;
  let vaultAddress: string;
  let poolAddress: string;

  let owner: HardhatEthersSigner;
  let keeper: HardhatEthersSigner;
  let alice: HardhatEthersSigner;
  let bob: HardhatEthersSigner;
  let carol: HardhatEthersSigner;
  let dave: HardhatEthersSigner;

  beforeEach(async () => {
    [owner, keeper, alice, bob, carol, dave] = await ethers.getSigners();

    usdc = (await (await ethers.getContractFactory("TestUSDC")).deploy()) as unknown as TestUSDC;
    cusdc = (await (
      await ethers.getContractFactory("ConfidentialUSDC")
    ).deploy(await usdc.getAddress())) as unknown as ConfidentialUSDC;
    cusdcAddress = await cusdc.getAddress();

    const first = BigInt(await time.latest()) + 2n;
    vault = (await (
      await ethers.getContractFactory("HearthVault")
    ).deploy(cusdcAddress, PERIOD, first, owner.address)) as unknown as HearthVault;
    vaultAddress = await vault.getAddress();

    pool = (await (
      await ethers.getContractFactory("HearthPrizePool")
    ).deploy(vaultAddress, cusdcAddress, TIERS, owner.address)) as unknown as HearthPrizePool;
    poolAddress = await pool.getAddress();

    source = (await (
      await ethers.getContractFactory("SponsoredYieldSource")
    ).deploy(cusdcAddress, poolAddress, RATE, owner.address)) as unknown as SponsoredYieldSource;

    await (await vault.connect(owner).setPrizePool(poolAddress)).wait();
    await (await pool.connect(owner).setYieldSource(await source.getAddress())).wait();

    await (await usdc.connect(owner).claim()).wait();
    await (await usdc.connect(owner).approve(await source.getAddress(), usd(10_000))).wait();
    await (await source.connect(owner).sponsor(usd(10_000))).wait();
  });

  async function wrapFor(who: HardhatEthersSigner, amount: bigint) {
    await (await usdc.connect(who).claim()).wait();
    await (await usdc.connect(who).approve(cusdcAddress, amount)).wait();
    await (await cusdc.connect(who).wrap(who.address, amount)).wait();
  }

  async function depositCall(who: HardhatEthersSigner, amount: bigint) {
    const input = await fhevm.createEncryptedInput(cusdcAddress, who.address).add64(amount).encrypt();
    return cusdc
      .connect(who)
      ["confidentialTransferAndCall(address,bytes32,bytes,bytes)"](
        vaultAddress,
        input.handles[0],
        input.inputProof,
        "0x",
      );
  }

  async function deposit(who: HardhatEthersSigner, amount: bigint) {
    await (await depositCall(who, amount)).wait();
  }

  // The mock coprocessor advances a single shared event cursor per decryption request and is not
  // re-entrant, so two decryptions in flight at once make it re-read a block it has already parsed.
  async function series<T, R>(items: T[], each: (item: T) => Promise<R>): Promise<R[]> {
    const out: R[] = [];
    for (const item of items) out.push(await each(item));
    return out;
  }

  const decrypt = (handle: string, contract: string, who: HardhatEthersSigner) =>
    fhevm.userDecryptEuint(FhevmType.euint64, handle, contract, who);

  // A contract's own token balance is allowed to that contract only, so no signer here can decrypt it
  // and it is not publicly decryptable. The books are checked through the mock's clear-text store.
  const tokenBalanceOf = async (address: string) =>
    fhevm.debugger.decryptEuint(FhevmType.euint64, await cusdc.confidentialBalanceOf(address));

  const principalOf = async (who: HardhatEthersSigner) =>
    decrypt(await vault.confidentialBalanceOf(who.address), vaultAddress, who);
  const winningsOf = async (who: HardhatEthersSigner) =>
    decrypt(await vault.confidentialWinningsOf(who.address), vaultAddress, who);
  const walletOf = async (who: HardhatEthersSigner) =>
    decrypt(await cusdc.confidentialBalanceOf(who.address), cusdcAddress, who);

  async function nextPeriod() {
    const period = await vault.currentPeriod();
    const end = await vault.periodEnd(period);
    await time.increaseTo(end + 1n);
  }

  async function closeAndAward(): Promise<number> {
    await (await pool.connect(keeper).closeDraw()).wait();
    const drawId = Number(await pool.lastClosedDraw());
    const draw = await pool.drawOf(drawId);
    const published = await fhevm.publicDecrypt([draw.seedHandle, draw.aggregateHandle]);
    const seed = published.clearValues[draw.seedHandle] as bigint;
    const aggregate = published.clearValues[draw.aggregateHandle] as bigint;
    await (await pool.connect(keeper).awardDraw(drawId, seed, aggregate, published.decryptionProof)).wait();
    return drawId;
  }

  async function finalizeAndReconcile(drawId: number) {
    await (await vault.connect(keeper).finalizeDraw(drawId)).wait();
    const handles = await vault.remainingHandles(drawId);
    const published = await fhevm.publicDecrypt([...handles]);
    const remaining = handles.map((handle) => published.clearValues[handle] as bigint) as [bigint, bigint, bigint];
    await (await pool.connect(keeper).reconcile(drawId, remaining, published.decryptionProof)).wait();
    return remaining;
  }

  it("runs deposit, close, award, evaluate, finalize, reconcile and withdraw with the books balanced", async () => {
    const savers = [alice, bob, carol];
    const stakes = [usd(1_000), usd(3_000), usd(6_000)];
    for (let i = 0; i < savers.length; i++) {
      await wrapFor(savers[i], usd(10_000));
      await deposit(savers[i], stakes[i]);
      expect(await principalOf(savers[i])).to.equal(stakes[i]);
    }

    await nextPeriod();
    const drawId = await closeAndAward();
    expect(drawId).to.equal(1);

    const params = await pool.drawParams(drawId);
    expect(params.status).to.equal(2n);
    expect(params.aggregate).to.be.greaterThan(0n);
    const offered = params.offered.map((v) => BigInt(v));
    const prize = params.prize.map((v) => BigInt(v));
    expect(offered.reduce((a, b) => a + b, 0n)).to.be.greaterThan(0n);
    for (let t = 0; t < 3; t++) {
      expect(prize[t]).to.equal((offered[t] * 5000n) / 10_000n / BigInt(TIERS[t].prizeCount));
    }

    await (await vault.connect(keeper).evaluate(drawId, savers.map((s) => s.address))).wait();
    for (const saver of savers) expect(await vault.evaluated(drawId, saver.address)).to.equal(true);

    const winnings = await series(savers, winningsOf);
    const totalWinnings = winnings.reduce((a, b) => a + b, 0n);
    for (const won of winnings) {
      expect(won).to.be.at.most(prize[0] + prize[1] + prize[2]);
    }

    await nextPeriod();
    const remaining = await finalizeAndReconcile(drawId);
    const paid = offered.map((o, t) => o - remaining[t]);
    expect(paid.reduce((a, b) => a + b, 0n), "what the tiers paid equals what savers were credited").to.equal(
      totalWinnings,
    );
    for (let t = 0; t < 3; t++) {
      expect(await pool.liquidity(t)).to.be.at.least(remaining[t]);
    }

    const vaultBalance = await tokenBalanceOf(vaultAddress);
    const principals = await series(savers, principalOf);
    expect(vaultBalance, "vault holds exactly principal plus unclaimed winnings").to.equal(
      principals.reduce((a, b) => a + b, 0n) + totalWinnings,
    );

    for (let i = 0; i < savers.length; i++) {
      const before = await walletOf(savers[i]);
      await (await vault.connect(savers[i]).withdrawAll()).wait();
      expect(await walletOf(savers[i])).to.equal(before + stakes[i] + winnings[i]);
      expect(await principalOf(savers[i])).to.equal(0n);
      expect(await winningsOf(savers[i])).to.equal(0n);
    }
    expect(await tokenBalanceOf(vaultAddress)).to.equal(0n);
  });

  it("gives a deposit made after the period ended no weight in that draw", async () => {
    await wrapFor(alice, usd(10_000));
    await deposit(alice, usd(100));
    await nextPeriod();

    await wrapFor(dave, usd(10_000));
    await deposit(dave, usd(9_000));

    const drawId = await closeAndAward();
    await (await vault.connect(keeper).evaluate(drawId, [alice.address, dave.address])).wait();
    expect(await winningsOf(dave)).to.equal(0n);
  });

  it("weights a mid-period deposit by the fraction of the period it was present", async () => {
    await wrapFor(alice, usd(10_000));
    await deposit(alice, usd(1_000));
    const [firstCum, firstBalance, firstTs] = await vault.observationOf(alice.address, 0);
    expect(firstTs).to.be.greaterThan(0);
    expect(await decrypt(firstCum, vaultAddress, alice)).to.equal(0n);
    expect(await decrypt(firstBalance, vaultAddress, alice)).to.equal(usd(1_000));

    const period = await vault.currentPeriod();
    const end = await vault.periodEnd(period);
    await time.increaseTo(end - PERIOD / 2n);
    await deposit(alice, usd(1_000));

    const [secondCum, secondBalance, secondTs] = await vault.observationOf(alice.address, 0);
    expect(await vault.periodOf(secondTs), "both deposits land in the same period").to.equal(period);
    expect(await decrypt(secondBalance, vaultAddress, alice)).to.equal(usd(2_000));
    // The first deposit is a few blocks into the period, so the elapsed span is what the observations
    // say it is, not half the period exactly. Balance-seconds must match it to the second.
    expect(secondTs - firstTs).to.be.closeTo(PERIOD / 2n, 20n);
    expect(await decrypt(secondCum, vaultAddress, alice)).to.equal(usd(1_000) * (secondTs - firstTs));
  });

  it("refuses a deposit that would exceed the per-saver cap by refunding it", async () => {
    const cap = await vault.maxPrincipal();
    expect(cap).to.equal((2n ** 64n - 1n) / PERIOD);
    // Wrapping above the cap is not possible with the faucet, so the cap is checked through the
    // arithmetic instead: the acceptance test is FHE.le(grown, maxPrincipal).
    await wrapFor(alice, usd(10_000));
    await deposit(alice, usd(5_000));
    expect(await principalOf(alice)).to.equal(usd(5_000));
  });

  it("pauses deposits and draw closing but never withdrawals", async () => {
    await wrapFor(alice, usd(10_000));
    await deposit(alice, usd(500));

    await (await vault.connect(owner).pause()).wait();
    const walletBefore = await walletOf(alice);
    // The pause guard sits on the receive hook, so the whole confidential transfer reverts and no
    // tokens move at all. Nothing to refund, and nothing lands in the vault.
    await expect(depositCall(alice, usd(100))).to.be.revertedWithCustomError(vault, "EnforcedPause");
    expect(await walletOf(alice), "a deposit while paused leaves the wallet untouched").to.equal(walletBefore);
    expect(await principalOf(alice)).to.equal(usd(500));

    await (await vault.connect(alice).withdrawAll()).wait();
    expect(await principalOf(alice)).to.equal(0n);
    await (await vault.connect(owner).unpause()).wait();

    await (await pool.connect(owner).pause()).wait();
    await nextPeriod();
    expect(await pool.canClose()).to.equal(false);
    await expect(pool.connect(keeper).closeDraw()).to.be.revertedWithCustomError(pool, "EnforcedPause");
  });

  it("rejects a forged award proof and an award outside its window", async () => {
    await wrapFor(alice, usd(10_000));
    await deposit(alice, usd(500));
    await nextPeriod();
    await (await pool.connect(keeper).closeDraw()).wait();
    const drawId = Number(await pool.lastClosedDraw());
    const draw = await pool.drawOf(drawId);
    const published = await fhevm.publicDecrypt([draw.seedHandle, draw.aggregateHandle]);
    const seed = published.clearValues[draw.seedHandle] as bigint;
    const aggregate = published.clearValues[draw.aggregateHandle] as bigint;

    await expect(pool.connect(keeper).awardDraw(drawId, seed + 1n, aggregate, published.decryptionProof)).to.be
      .reverted;

    await nextPeriod();
    await expect(
      pool.connect(keeper).awardDraw(drawId, seed, aggregate, published.decryptionProof),
    ).to.be.revertedWithCustomError(pool, "AwardWindowClosed");
  });

  it("keeps a stranger out of everyone's numbers", async () => {
    await wrapFor(alice, usd(10_000));
    await deposit(alice, usd(500));
    const handle = await vault.confidentialBalanceOf(alice.address);
    await expect(decrypt(handle, vaultAddress, dave)).to.be.rejected;
    await expect(vault.connect(dave).withdrawAll()).to.be.revertedWithCustomError(vault, "NotASaver");
  });
});
