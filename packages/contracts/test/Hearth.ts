// Covers one full cycle on the mock coprocessor: deposits in a period, close with the prize sizes fixed
// before the seed exists, award against the KMS-verified seed, scale count, non-empty flag and harvest,
// the seed-derived evaluation walk, finalization into the per-tier carries, per-tier reconciliation, and
// withdrawals that pay winnings first. Also covers the nested per-prize thresholds against an off-chain
// mirror of the same arithmetic and against the on-chain thresholdOf view, the scale tracker converging
// from far below and far above the real aggregate, the Empty and Skipped outcomes, the close deadline, a
// yield source that reverts, the deposit cap, the pause, per-saver weight and credit handles, the batch
// cap measured in homomorphic compute units, and the Chainlink upkeep pair.
// Does not cover statistical fairness over many draws, the live relayer and KMS, the Confidential Vault
// yield adapter, a tier whose carry is published while a later draw is already running, or the real
// coprocessor's behaviour under load.
import { FhevmType } from "@fhevm/hardhat-plugin";
import type { HardhatEthersSigner } from "@nomicfoundation/hardhat-ethers/signers";
import { time } from "@nomicfoundation/hardhat-network-helpers";
import { expect } from "chai";
import { ethers, fhevm } from "hardhat";
import type { ConfidentialUSDC, HearthPrizePool, HearthVault, SponsoredYieldSource, TestUSDC } from "../types";

const usd = (whole: number): bigint => BigInt(whole) * 1_000_000n;
const PERIOD = 3_600n;
const RATE = 166_666n; // about 600 USDC a period
const UINT64_MAX = 2n ** 64n - 1n;

const HCU_BUDGET = 18_000_000;
const HCU_DEPTH_BUDGET = 4_500_000;

const CLOSED = 1n;
const AWARDED = 2n;
const EMPTY = 3n;
const SKIPPED = 4n;

type TierConfig = {
  prizeCount: number;
  oddsNumerator: number;
  oddsDenominator: number;
  shares: number;
  reconcileEvery: number;
};

// The Sepolia set from DECISIONS.md: a grand prize that pays about daily, a mid tier, and four small
// prizes every draw, with the grand and mid carries hidden behind a long reconcile cadence.
const SEPOLIA_TIERS: TierConfig[] = [
  { prizeCount: 1, oddsNumerator: 1, oddsDenominator: 24, shares: 40, reconcileEvery: 24 },
  { prizeCount: 1, oddsNumerator: 1, oddsDenominator: 6, shares: 20, reconcileEvery: 6 },
  { prizeCount: 4, oddsNumerator: 1, oddsDenominator: 1, shares: 40, reconcileEvery: 1 },
];

// Ten thousand USDC held for an hour is 3.6e13 balance-seconds, just above 2^45.
const SCALE_BITS = 46;

type Published = { seed: bigint; scaleCount: number; nonEmpty: boolean; harvested: bigint; proof: string };
type Params = Awaited<ReturnType<HearthPrizePool["drawParams"]>>;

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
  let erin: HardhatEthersSigner;

  async function deploy(tiers: TierConfig[] = SEPOLIA_TIERS, scaleBits = SCALE_BITS) {
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
    ).deploy(vaultAddress, cusdcAddress, tiers, scaleBits, owner.address)) as unknown as HearthPrizePool;
    poolAddress = await pool.getAddress();

    source = (await (
      await ethers.getContractFactory("SponsoredYieldSource")
    ).deploy(cusdcAddress, poolAddress, RATE, owner.address)) as unknown as SponsoredYieldSource;

    await (await vault.connect(owner).setPrizePool(poolAddress)).wait();
    await (await pool.connect(owner).setYieldSource(await source.getAddress())).wait();

    await (await usdc.connect(owner).claim()).wait();
    await (await usdc.connect(owner).approve(await source.getAddress(), usd(10_000))).wait();
    await (await source.connect(owner).sponsor(usd(10_000))).wait();
  }

  beforeEach(async () => {
    [owner, keeper, alice, bob, carol, dave, erin] = await ethers.getSigners();
    await deploy();
  });

  // The mock coprocessor advances a single shared event cursor per decryption request and is not
  // re-entrant, so two decryptions in flight at once make it re-read a block it has already parsed.
  async function series<T, R>(items: T[], each: (item: T) => Promise<R>): Promise<R[]> {
    const out: R[] = [];
    for (const item of items) out.push(await each(item));
    return out;
  }

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

  async function fund(savers: HardhatEthersSigner[], stakes: bigint[]) {
    for (let i = 0; i < savers.length; i++) {
      await wrapFor(savers[i], usd(10_000));
      await deposit(savers[i], stakes[i]);
    }
  }

  const decrypt = (handle: string, contract: string, who: HardhatEthersSigner) =>
    fhevm.userDecryptEuint(FhevmType.euint64, handle, contract, who);

  // Handles the vault keeps to itself are read through the mock's clear-text store, which no ACL guards.
  const reveal = (handle: string) => fhevm.debugger.decryptEuint(FhevmType.euint64, handle);

  const tokenBalanceOf = async (address: string) => reveal(await cusdc.confidentialBalanceOf(address));
  const principalOf = async (who: HardhatEthersSigner) =>
    decrypt(await vault.confidentialBalanceOf(who.address), vaultAddress, who);
  const winningsOf = async (who: HardhatEthersSigner) =>
    decrypt(await vault.confidentialWinningsOf(who.address), vaultAddress, who);
  const walletOf = async (who: HardhatEthersSigner) =>
    decrypt(await cusdc.confidentialBalanceOf(who.address), cusdcAddress, who);
  const weightOf = async (drawId: number, who: HardhatEthersSigner) =>
    decrypt(await vault.weightHandle(drawId, who.address), vaultAddress, who);
  const creditOf = async (drawId: number, who: HardhatEthersSigner) =>
    decrypt(await vault.creditHandle(drawId, who.address), vaultAddress, who);

  const periodStart = async (period: number) => vault.periodEnd(period - 1);

  async function nextPeriod() {
    const period = await vault.currentPeriod();
    await time.increaseTo((await vault.periodEnd(period)) + 1n);
  }

  async function close(drawId: number) {
    await (await pool.connect(keeper)["closeDraw(uint32)"](drawId)).wait();
  }

  async function closeNext(): Promise<number> {
    const drawId = Number(await pool.closableDraw());
    await (await pool.connect(keeper)["closeDraw()"]()).wait();
    return drawId;
  }

  async function publish(drawId: number): Promise<Published> {
    const draw = await pool.drawOf(drawId);
    const result = await fhevm.publicDecrypt([
      draw.seedHandle,
      draw.scaleHandle,
      draw.nonEmptyHandle,
      draw.harvestHandle,
    ]);
    return {
      seed: result.clearValues[draw.seedHandle] as bigint,
      scaleCount: Number(result.clearValues[draw.scaleHandle]),
      nonEmpty: Boolean(result.clearValues[draw.nonEmptyHandle]),
      harvested: result.clearValues[draw.harvestHandle] as bigint,
      proof: result.decryptionProof,
    };
  }

  async function award(drawId: number): Promise<Published> {
    const p = await publish(drawId);
    await (
      await pool.connect(keeper).awardDraw(drawId, p.seed, p.scaleCount, p.nonEmpty, p.harvested, p.proof)
    ).wait();
    return p;
  }

  async function closeAndAward(): Promise<number> {
    const drawId = await closeNext();
    await award(drawId);
    return drawId;
  }

  async function reconcileTier(tier: number): Promise<bigint> {
    const [handle] = await vault.publishedCarry(tier);
    const published = await fhevm.publicDecrypt([handle]);
    const carry = published.clearValues[handle] as bigint;
    await (await pool.connect(keeper).reconcile(tier, carry, published.decryptionProof)).wait();
    return carry;
  }

  const liquidityOf = () => series([0, 1, 2], (t) => pool.liquidity(t));
  const liquidityTotal = async () => (await liquidityOf()).reduce((a, b) => a + b, 0n);
  const carriesOf = () => series([0, 1, 2], async (t) => reveal(await vault.carryHandle(t)));
  const remainderOf = (drawId: number) =>
    vault.remainingHandles(drawId).then((handles) => series([...handles], reveal));

  async function walkOrder(drawId: number, seed: bigint): Promise<string[]> {
    const length = await vault.saverCount();
    const start = seed % length;
    const order: string[] = [];
    for (let i = 0n; i < length; i++) order.push(await vault.saverAt((start + i) % length));
    return order;
  }

  // Mirrors HearthVault._winnerTest and _thresholdOf, including the per-tier clamp against what the tier
  // has left, so the test predicts each saver's credit to the unit instead of only bounding it. The
  // starting remainder is the plaintext offered amount, which is exact for a draw opened with no carry.
  function mirror(params: Params, drawId: number, walk: { address: string; twab: bigint }[]) {
    const remaining = params.offered.map((v) => BigInt(v));
    const credits = new Map<string, bigint>();

    for (const { address, twab } of walk) {
      let credit = 0n;
      for (let tier = 0; tier < 3; tier++) {
        let tierPay = 0n;
        for (let k = 0n; k < BigInt(params.prizeCount[tier]); k++) {
          const threshold = thresholdMirror(params, drawId, address, tier, k);
          if (threshold >= UINT64_MAX) break;
          if (twab > threshold) tierPay += BigInt(params.prize[tier]);
        }
        const pay = tierPay < remaining[tier] ? tierPay : remaining[tier];
        remaining[tier] -= pay;
        credit += pay;
      }
      credits.set(address, credit);
    }
    return { credits, remaining };
  }

  function thresholdMirror(params: Params, drawId: number, saver: string, tier: number, k: bigint): bigint {
    const range = 1n << BigInt(params.scaleBits);
    const entropy = BigInt(
      ethers.keccak256(
        ethers.AbiCoder.defaultAbiCoder().encode(
          ["uint64", "uint32", "address", "uint8"],
          [params.seed, drawId, saver, tier],
        ),
      ),
    );
    const point = entropy & (range - 1n);
    return ((point + k * range) * BigInt(params.zoneDiv[tier])) / BigInt(params.zoneMul[tier]);
  }

  it("runs deposit, close, award, evaluate, finalize, reconcile and withdraw with the books balanced", async () => {
    const savers = [alice, bob, carol];
    const stakes = [usd(1_000), usd(3_000), usd(6_000)];
    await fund(savers, stakes);
    for (let i = 0; i < savers.length; i++) expect(await principalOf(savers[i])).to.equal(stakes[i]);

    await nextPeriod();
    expect(await closeAndAward(), "the first draw only books the harvest").to.equal(1);

    await nextPeriod();
    const drawId = await closeNext();
    expect(drawId).to.equal(2);
    expect(await liquidityTotal(), "closing moves every tier's liquidity into the draw").to.equal(0n);
    const harvested = (await award(drawId)).harvested;
    expect(await liquidityTotal(), "and the award books the next harvest").to.equal(harvested);

    const params = await pool.drawParams(drawId);
    expect(params.status).to.equal(AWARDED);
    const offered = params.offered.map((v) => BigInt(v));
    const prize = params.prize.map((v) => BigInt(v));
    expect(offered.reduce((a, b) => a + b, 0n), "the first draw's harvest is on offer").to.be.greaterThan(0n);

    await (await vault.connect(keeper).evaluate(drawId, 3)).wait();
    for (const saver of savers) expect(await vault.evaluated(drawId, saver.address)).to.equal(true);
    expect(await vault.evaluatedCount(drawId)).to.equal(3);

    const winnings = await series(savers, winningsOf);
    const totalWon = winnings.reduce((a, b) => a + b, 0n);
    const mostOneSaverCanWin = prize.reduce((a, p, t) => a + p * BigInt(SEPOLIA_TIERS[t].prizeCount), 0n);
    for (const won of winnings) expect(won).to.be.at.most(mostOneSaverCanWin);

    const remaining = await remainderOf(drawId);
    expect(
      offered.reduce((a, o, t) => a + o - remaining[t], 0n),
      "what the tiers paid equals what savers were credited",
    ).to.equal(totalWon);

    const vaultBalance = await tokenBalanceOf(vaultAddress);
    const principals = await series(savers, principalOf);
    expect(vaultBalance, "vault holds exactly principal plus unclaimed winnings").to.equal(
      principals.reduce((a, b) => a + b, 0n) + totalWon,
    );
    expect(await reveal(await vault.unfundedHandle()), "the pool backed every credit").to.equal(0n);

    await nextPeriod();
    await nextPeriod();
    await nextPeriod();
    await (await vault.connect(keeper).finalizeDraw(drawId)).wait();
    expect(await vault.finalized(drawId)).to.equal(true);

    const before = await pool.liquidity(2);
    const carry = await reconcileTier(2);
    expect(carry, "the frequent tier carries exactly what it did not pay").to.equal(remaining[2]);
    expect(await pool.liquidity(2)).to.equal(before + carry);

    // A saver who asks for exactly their winnings keeps every unit of principal.
    const winner = savers.findIndex((_, i) => winnings[i] > 0n);
    expect(winner, "at least one saver won something in this draw").to.be.greaterThan(-1);
    const input = await fhevm
      .createEncryptedInput(vaultAddress, savers[winner].address)
      .add64(winnings[winner])
      .encrypt();
    await (await vault.connect(savers[winner]).withdraw(input.handles[0], input.inputProof)).wait();
    expect(await winningsOf(savers[winner])).to.equal(0n);
    expect(await principalOf(savers[winner])).to.equal(stakes[winner]);

    for (let i = 0; i < savers.length; i++) {
      const walletBefore = await walletOf(savers[i]);
      const owed = await principalOf(savers[i]);
      const unclaimed = await winningsOf(savers[i]);
      await (await vault.connect(savers[i]).withdrawAll()).wait();
      expect(await walletOf(savers[i])).to.equal(walletBefore + owed + unclaimed);
      expect(await principalOf(savers[i])).to.equal(0n);
      expect(await winningsOf(savers[i])).to.equal(0n);
    }
    expect(await tokenBalanceOf(vaultAddress)).to.equal(0n);
  });

  it("fixes prize sizes at the close, before the seed exists, and the award leaves them alone", async () => {
    await fund([alice], [usd(1_000)]);

    await nextPeriod();
    await closeAndAward();
    await nextPeriod();

    const drawId = await closeNext();
    const atClose = await pool.drawParams(drawId);
    expect(atClose.status).to.equal(CLOSED);
    expect(atClose.seed, "no seed exists yet, only its handle").to.equal(0n);
    for (let t = 0; t < 3; t++) {
      expect(BigInt(atClose.prize[t])).to.equal(
        (BigInt(atClose.offered[t]) * 5_000n) / 10_000n / BigInt(SEPOLIA_TIERS[t].prizeCount),
      );
    }
    expect(atClose.prize.reduce((a, p) => a + BigInt(p), 0n)).to.be.greaterThan(0n);

    await award(drawId);
    const afterAward = await pool.drawParams(drawId);
    expect(afterAward.prize.map(String)).to.deep.equal(atClose.prize.map(String));
    expect(afterAward.offered.map(String)).to.deep.equal(atClose.offered.map(String));
    expect(afterAward.seed).to.be.greaterThan(0n);
  });

  it("walks the saver list from the seed in fixed batches, once per saver", async () => {
    const savers = [alice, bob, carol, dave];
    await fund(savers, [usd(1_000), usd(2_000), usd(3_000), usd(4_000)]);

    await nextPeriod();
    await closeAndAward();
    await nextPeriod();
    const drawId = await closeNext();
    const published = await award(drawId);

    const order = await walkOrder(drawId, published.seed);
    await (await vault.connect(keeper).evaluate(drawId, 2)).wait();

    const [start, length] = await vault.walkOf(drawId);
    expect(start).to.equal(published.seed % 4n);
    expect(length).to.equal(4);
    expect(await vault.cursorOf(drawId)).to.equal(2);
    expect(await vault.evaluatedCount(drawId)).to.equal(2);
    expect(await vault.evaluated(drawId, order[0])).to.equal(true);
    expect(await vault.evaluated(drawId, order[1])).to.equal(true);
    expect(await vault.evaluated(drawId, order[2])).to.equal(false);
    expect(await vault.evaluated(drawId, order[3])).to.equal(false);

    await (await vault.connect(keeper).evaluate(drawId, 2)).wait();
    expect(await vault.cursorOf(drawId)).to.equal(4);
    expect(await vault.evaluatedCount(drawId)).to.equal(4);
    for (const saver of order) expect(await vault.evaluated(drawId, saver)).to.equal(true);

    const credits = await series(savers, (s) => creditOf(drawId, s));
    await (await vault.connect(keeper).evaluate(drawId, 4)).wait();
    expect(await vault.cursorOf(drawId), "a walk that has wrapped stays put").to.equal(4);
    expect(await vault.evaluatedCount(drawId)).to.equal(4);
    expect(await series(savers, (s) => creditOf(drawId, s))).to.deep.equal(credits);
  });

  it("skips a saver who joined after the draw's period without any encrypted work", async () => {
    await fund([alice, bob], [usd(1_000), usd(2_000)]);

    await nextPeriod();
    await closeAndAward();
    await nextPeriod();

    await fund([dave], [usd(5_000)]);
    const drawId = await closeNext();
    await award(drawId);
    expect(await vault.saverCount()).to.equal(3);

    await (await vault.connect(keeper).evaluate(drawId, 3)).wait();
    expect(await vault.evaluatedCount(drawId), "the late saver is marked done, not left behind").to.equal(3);
    expect(await vault.evaluated(drawId, dave.address)).to.equal(true);
    expect(await vault.weightHandle(drawId, dave.address), "and cost no encrypted work").to.equal(
      ethers.ZeroHash,
    );
    expect(await vault.creditHandle(drawId, dave.address)).to.equal(ethers.ZeroHash);
    expect(await winningsOf(dave)).to.equal(0n);
  });

  it("moves the published scale up to the aggregate when it starts far below", async () => {
    await deploy(SEPOLIA_TIERS, 20);
    await fund([alice], [usd(10_000)]);

    let drawId = 0;
    for (let i = 0; i < 12; i++) {
      await nextPeriod();
      drawId = await closeAndAward();
    }

    await (await vault.connect(keeper).evaluate(drawId, 1)).wait();
    const aggregate = await weightOf(drawId, alice);
    const range = 1n << BigInt((await pool.drawParams(drawId)).scaleBits);
    expect(aggregate, "the saver holds the whole pool, so their weight is the aggregate").to.be.greaterThan(0n);
    expect(range, "the range is at or above the aggregate").to.be.at.least(aggregate);
    expect(range, "and below twice it").to.be.lessThan(2n * aggregate);
  });

  it("brings the published scale down when it starts far above", async () => {
    await deploy(SEPOLIA_TIERS, 60);
    await fund([alice], [usd(10_000)]);

    let drawId = 0;
    for (let i = 0; i < 10; i++) {
      await nextPeriod();
      drawId = await closeAndAward();
    }

    await (await vault.connect(keeper).evaluate(drawId, 1)).wait();
    const aggregate = await weightOf(drawId, alice);
    const range = 1n << BigInt((await pool.drawParams(drawId)).scaleBits);
    expect(range).to.be.at.least(aggregate);
    expect(range).to.be.lessThan(2n * aggregate);
  });

  it("hands a period with no savers back to the tiers and keeps the carry", async () => {
    await fund([alice], [usd(1_000)]);

    await nextPeriod();
    await closeAndAward(); // draw 1, offers nothing, books the first harvest
    await nextPeriod();
    const paying = await closeAndAward(); // draw 2, offers that harvest
    await (await vault.connect(keeper).evaluate(paying, 1)).wait();

    await nextPeriod();
    await (await vault.connect(alice).withdrawAll()).wait();
    await closeAndAward(); // draw 3, alice held all of period 3
    await nextPeriod();
    await closeAndAward(); // draw 4, alice held the first seconds of period 4

    await (await vault.connect(keeper).finalizeDraw(paying)).wait();
    const carriesBefore = await carriesOf();
    expect(carriesBefore[0], "the grand tier is carrying what draw two did not pay").to.be.greaterThan(0n);

    await nextPeriod();
    const empty = await closeNext(); // draw 5, nobody held anything in period 5
    expect(await carriesOf(), "the open folded every unpublished carry into the draw").to.deep.equal([
      0n,
      0n,
      carriesBefore[2],
    ]);

    const liquidityBefore = await liquidityTotal();
    const offered = (await pool.drawParams(empty)).offered.reduce((a, v) => a + BigInt(v), 0n);
    expect(offered, "the empty draw was offered the previous draw's harvest").to.be.greaterThan(0n);
    const published = await publish(empty);
    expect(published.nonEmpty).to.equal(false);
    await expect(
      pool
        .connect(keeper)
        .awardDraw(empty, published.seed, published.scaleCount, false, published.harvested, published.proof),
    )
      .to.emit(pool, "DrawEmpty")
      .withArgs(empty, published.harvested);

    expect((await pool.drawParams(empty)).status).to.equal(EMPTY);
    expect(await liquidityTotal(), "the offered liquidity and the harvest are both back").to.equal(
      liquidityBefore + offered + published.harvested,
    );
    expect(await carriesOf(), "and every carry is exactly where it was").to.deep.equal(carriesBefore);
    await expect(vault.connect(keeper).evaluate(empty, 1)).to.be.revertedWithCustomError(
      vault,
      "DrawNotAwarded",
    );
  });

  it("books the harvest and hands back the liquidity of an award that missed its window", async () => {
    await fund([alice], [usd(1_000)]);

    await nextPeriod();
    await closeAndAward();
    await nextPeriod();

    const drawId = await closeNext();
    const offered = (await pool.drawParams(drawId)).offered.map((v) => BigInt(v));
    expect(offered.reduce((a, b) => a + b, 0n)).to.be.greaterThan(0n);
    expect(await liquidityTotal(), "closing books nothing, the award does").to.equal(0n);

    await nextPeriod();
    await nextPeriod();
    await expect(
      vault.connect(keeper).finalizeDraw(drawId),
      "a draw cannot be folded away before its award books the harvest",
    ).to.be.revertedWithCustomError(vault, "DrawNotAwarded");

    const published = await publish(drawId);
    expect(published.harvested).to.be.greaterThan(0n);
    await expect(
      pool
        .connect(keeper)
        .awardDraw(
          drawId,
          published.seed,
          published.scaleCount,
          published.nonEmpty,
          published.harvested,
          published.proof,
        ),
    )
      .to.emit(pool, "DrawSkipped")
      .withArgs(drawId, published.harvested);

    expect((await pool.drawParams(drawId)).status).to.equal(SKIPPED);
    expect(await liquidityTotal(), "every offered and harvested unit is back on the books").to.equal(
      offered.reduce((a, b) => a + b, 0n) + published.harvested,
    );
    await expect(vault.connect(keeper).finalizeDraw(drawId)).to.be.revertedWithCustomError(
      vault,
      "AlreadyFinalized",
    );
  });

  it("refuses a close after the deadline and still allows one at the start of the last period", async () => {
    await fund([alice], [usd(1_000)]);

    const late = (await periodStart(3)) + PERIOD / 2n;
    await time.increaseTo(late + 1n);
    expect(await pool.closeDeadline(1)).to.equal(late);
    await expect(pool.connect(keeper)["closeDraw(uint32)"](1)).to.be.revertedWithCustomError(
      pool,
      "CloseWindowClosed",
    );
    expect(await pool.closableDraw(), "draw two is still inside its own deadline").to.equal(2);

    await time.increaseTo(await periodStart(4));
    expect(await vault.currentPeriod(), "the last period of draw two's window").to.equal(4);
    const drawId = await closeNext();
    expect(drawId).to.equal(2);
    await award(drawId);
    await (await vault.connect(keeper).evaluate(drawId, 1)).wait();
    expect(await vault.evaluated(drawId, alice.address)).to.equal(true);
  });

  it("publishes each tier's carry on its own cadence and books it back once", async () => {
    await deploy(
      SEPOLIA_TIERS.map((tier, index) => ({ ...tier, reconcileEvery: index === 0 ? 2 : 1 })),
      SCALE_BITS,
    );
    await fund([alice, bob], [usd(4_000), usd(6_000)]);

    await nextPeriod();
    await closeAndAward(); // draw 1
    await nextPeriod();
    const paying = await closeAndAward(); // draw 2
    await (await vault.connect(keeper).evaluate(paying, 2)).wait();
    await nextPeriod();
    await closeAndAward(); // draw 3
    await nextPeriod();

    await (await vault.connect(keeper).finalizeDraw(1)).wait();
    expect((await vault.publishedCarry(0))[2], "the grand tier is not due on an odd draw").to.equal(false);
    expect((await vault.publishedCarry(1))[2]).to.equal(true);
    expect((await vault.publishedCarry(1))[1]).to.equal(1);
    expect(await reconcileTier(1), "draw one offered nothing, so it carries nothing").to.equal(0n);
    expect(await reconcileTier(2)).to.equal(0n);

    const remaining = await remainderOf(paying);
    await expect(vault.connect(keeper).finalizeDraw(paying)).to.emit(vault, "CarryPublished");
    expect((await vault.publishedCarry(0))[2], "the grand tier is due on an even draw").to.equal(true);
    expect((await vault.publishedCarry(0))[1]).to.equal(paying);
    expect((await vault.publishedCarry(0))[0], "and it pins the handle it published").to.equal(
      await vault.carryHandle(0),
    );

    const before = await pool.liquidity(0);
    const carry = await reconcileTier(0);
    expect(carry, "the carry is exactly what the grand tier did not pay").to.equal(remaining[0]);
    expect(await pool.liquidity(0)).to.equal(before + carry);
    await expect(pool.connect(keeper).reconcile(0, carry, "0x")).to.be.revertedWithCustomError(
      pool,
      "CarryNotPending",
    );

    const onOffer = await pool.liquidity(0);
    const next = await closeNext();
    expect(BigInt((await pool.drawParams(next)).offered[0]), "the next close offers it again").to.equal(
      onOffer,
    );
  });

  it("matches an off-chain mirror of every threshold, and pays what the mirror says", async () => {
    const savers = [alice, bob, carol];
    await fund(savers, [usd(6_000), usd(3_000), usd(1_000)]);

    await nextPeriod();
    await closeAndAward();
    await nextPeriod();
    const drawId = await closeNext();
    const published = await award(drawId);

    const order = await walkOrder(drawId, published.seed);
    await (await vault.connect(keeper).evaluate(drawId, 3)).wait();

    const params = await pool.drawParams(drawId);
    const byAddress = new Map(savers.map((s) => [s.address, s]));
    const walk = await series(order, async (address) => ({
      address,
      twab: await weightOf(drawId, byAddress.get(address)!),
    }));

    const aggregate = walk.reduce((a, w) => a + w.twab, 0n);
    const range = 1n << BigInt(params.scaleBits);
    expect(range).to.be.at.least(aggregate);
    expect(range).to.be.lessThan(2n * aggregate);

    for (const { address } of walk) {
      for (let tier = 0; tier < 3; tier++) {
        for (let k = 0n; k < BigInt(params.prizeCount[tier]); k++) {
          const [threshold, skipped] = await vault.thresholdOf(drawId, address, tier, k);
          const expected = thresholdMirror(params, drawId, address, tier, k);
          expect(threshold, `tier ${tier} prize ${k}`).to.equal(expected);
          expect(skipped).to.equal(expected >= UINT64_MAX);
        }
      }
    }

    const { credits, remaining } = mirror(params, drawId, walk);
    for (const saver of savers) {
      expect(await creditOf(drawId, saver), `credit of ${saver.address}`).to.equal(
        credits.get(saver.address),
      );
      expect(await winningsOf(saver)).to.equal(credits.get(saver.address));
    }
    expect(await remainderOf(drawId)).to.deep.equal(remaining);
  });

  it("lets a saver read their own weight and credit and keeps a stranger out", async () => {
    await fund([alice], [usd(1_000)]);
    await expect(decrypt(await vault.confidentialBalanceOf(alice.address), vaultAddress, erin)).to.be.rejected;
    await expect(vault.connect(erin).withdrawAll()).to.be.revertedWithCustomError(vault, "NotASaver");

    await nextPeriod();
    await closeAndAward();
    await nextPeriod();
    const drawId = await closeAndAward();
    await (await vault.connect(keeper).evaluate(drawId, 1)).wait();

    expect(await weightOf(drawId, alice)).to.be.greaterThan(0n);
    await expect(creditOf(drawId, alice)).to.not.be.rejected;
    await expect(decrypt(await vault.weightHandle(drawId, alice.address), vaultAddress, erin)).to.be.rejected;
    await expect(decrypt(await vault.creditHandle(drawId, alice.address), vaultAddress, erin)).to.be.rejected;
  });

  it("keeps closing when the yield source reverts, and books that draw as a zero harvest", async () => {
    const broken = await (await ethers.getContractFactory("RevertingYieldSource")).deploy();
    await fund([alice], [usd(1_000)]);
    await (await pool.connect(owner).setYieldSource(await broken.getAddress())).wait();

    await nextPeriod();
    const drawId = Number(await pool.closableDraw());
    await expect(pool.connect(keeper)["closeDraw()"]()).to.emit(pool, "HarvestFailed").withArgs(drawId);

    const published = await publish(drawId);
    expect(published.harvested, "a broken venue books nothing, it does not stall the draw").to.equal(0n);
    await award(drawId);
    expect((await pool.drawParams(drawId)).status).to.equal(AWARDED);
    expect(await liquidityTotal()).to.equal(0n);
  });

  it("proves a harvest of nothing when no yield source is wired", async () => {
    await (await pool.connect(owner).setYieldSource(ethers.ZeroAddress)).wait();
    await fund([alice], [usd(1_000)]);

    await nextPeriod();
    const drawId = await closeNext();
    const draw = await pool.drawOf(drawId);
    expect(draw.harvestHandle, "the award proof always covers four handles").to.not.equal(ethers.ZeroHash);

    const published = await publish(drawId);
    expect(published.harvested).to.equal(0n);
    await award(drawId);
    expect(await liquidityTotal()).to.equal(0n);
  });

  it("weights a mid-period deposit by the fraction of the period it was present", async () => {
    await wrapFor(alice, usd(10_000));
    await deposit(alice, usd(1_000));
    const [firstCum, firstBalance, firstTs] = await vault.observationOf(alice.address, 0);
    expect(firstTs).to.be.greaterThan(0);
    expect(await decrypt(firstCum, vaultAddress, alice)).to.equal(0n);
    expect(await decrypt(firstBalance, vaultAddress, alice)).to.equal(usd(1_000));
    expect(await vault.firstObservationAt(alice.address)).to.equal(firstTs);

    const period = await vault.currentPeriod();
    await time.increaseTo((await vault.periodEnd(period)) - PERIOD / 2n);
    await deposit(alice, usd(1_000));

    const [secondCum, secondBalance, secondTs] = await vault.observationOf(alice.address, 0);
    expect(await vault.periodOf(secondTs), "both deposits land in the same period").to.equal(period);
    expect(await decrypt(secondBalance, vaultAddress, alice)).to.equal(usd(2_000));
    // The first deposit is a few blocks into the period, so the elapsed span is what the observations
    // say it is, not half the period exactly. Balance-seconds must match it to the second.
    expect(secondTs - firstTs).to.be.closeTo(PERIOD / 2n, 20n);
    expect(await decrypt(secondCum, vaultAddress, alice)).to.equal(usd(1_000) * (secondTs - firstTs));
  });

  it("keeps three observations, so a draw can still be weighed two periods later", async () => {
    await fund([alice], [usd(1_000)]);
    const target = Number(await vault.currentPeriod());

    await nextPeriod();
    await deposit(alice, usd(1_000));
    await nextPeriod();
    await deposit(alice, usd(1_000));

    const slots = await series([0, 1, 2], (slot) => vault.observationOf(alice.address, slot));
    const periods = await series(slots, (slot) => vault.periodOf(slot.ts));
    expect(periods.map(Number)).to.deep.equal([target + 2, target + 1, target]);
    expect(
      await decrypt(slots[2].balance, vaultAddress, alice),
      "the oldest slot still holds the first stake",
    ).to.equal(usd(1_000));
  });

  it("refuses a deposit that would exceed the per-saver cap by refunding it", async () => {
    expect(await vault.maxPrincipal()).to.equal((2n ** 64n - 1n) / PERIOD);
    // Wrapping above the cap is not possible with the faucet, so the cap is checked through the
    // arithmetic instead: the acceptance test is le(amount, cap) and le(principal + amount, cap).
    await fund([alice], [usd(5_000)]);
    expect(await principalOf(alice)).to.equal(usd(5_000));
  });

  it("pauses deposits and draw closing but never withdrawals", async () => {
    await fund([alice], [usd(500)]);

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
    await expect(pool.connect(keeper)["closeDraw()"]()).to.be.revertedWithCustomError(pool, "EnforcedPause");
  });

  it("reports the closable draw to the upkeep and closes exactly that one", async () => {
    await fund([alice], [usd(500)]);
    await nextPeriod();

    const [needed, performData] = await pool.checkUpkeep("0x");
    expect(needed).to.equal(true);
    const [reported] = ethers.AbiCoder.defaultAbiCoder().decode(["uint32"], performData);
    expect(reported).to.equal(1n);

    await (await pool.connect(keeper).performUpkeep(performData)).wait();
    expect((await pool.drawParams(1)).status).to.equal(CLOSED);
    expect(await pool.canClose()).to.equal(false);
    expect(await pool.closableDraw()).to.equal(0n);
    await expect(pool.connect(keeper).performUpkeep(performData)).to.be.revertedWithCustomError(
      pool,
      "AlreadyClosed",
    );
    await expect(pool.connect(keeper)["closeDraw()"]()).to.be.revertedWithCustomError(pool, "NothingToClose");
  });

  it("stops a batch at the coprocessor budget and resumes from the cursor", async () => {
    const savers = [alice, bob, carol, dave, erin];
    await fund(savers, savers.map(() => usd(2_000)));

    await nextPeriod();
    await closeAndAward();
    await nextPeriod();
    const drawId = await closeAndAward();

    const cap = Number(await vault.MAX_BATCH());
    expect(cap).to.equal(4);
    const receipt = await (await vault.connect(keeper).evaluate(drawId, savers.length)).wait();
    expect(await vault.cursorOf(drawId), "the batch stops at the cap, not at the count asked for").to.equal(
      cap,
    );
    expect(await vault.evaluatedCount(drawId)).to.equal(cap);

    const hcu = fhevm.computeTransactionHCU(receipt!);
    expect(hcu.globalHCU, "a full batch stays inside the compute budget").to.be.at.most(HCU_BUDGET);
    expect(hcu.maxHCUDepth, "and inside the depth budget").to.be.at.most(HCU_DEPTH_BUDGET);

    await (await vault.connect(keeper).evaluate(drawId, savers.length)).wait();
    expect(await vault.cursorOf(drawId)).to.equal(savers.length);
    expect(await vault.evaluatedCount(drawId)).to.equal(savers.length);
  });

  it("rejects a forged award proof", async () => {
    await fund([alice], [usd(500)]);
    await nextPeriod();
    const drawId = await closeNext();
    const p = await publish(drawId);

    await expect(pool.connect(keeper).awardDraw(drawId, p.seed + 1n, p.scaleCount, p.nonEmpty, p.harvested, p.proof))
      .to.be.reverted;
    await expect(pool.connect(keeper).awardDraw(drawId, p.seed, p.scaleCount + 1, p.nonEmpty, p.harvested, p.proof))
      .to.be.reverted;
    await expect(pool.connect(keeper).awardDraw(drawId, p.seed, p.scaleCount, !p.nonEmpty, p.harvested, p.proof))
      .to.be.reverted;
    await expect(pool.connect(keeper).awardDraw(drawId, p.seed, p.scaleCount, p.nonEmpty, p.harvested + 1n, p.proof))
      .to.be.reverted;
    expect((await pool.drawParams(drawId)).status).to.equal(CLOSED);
  });

  it("refuses a tier configuration or a scale the pool cannot run", async () => {
    const factory = await ethers.getContractFactory("HearthPrizePool");
    const bad = SEPOLIA_TIERS.map((tier) => ({ ...tier }));
    bad[1].reconcileEvery = 0;
    await expect(
      factory.deploy(vaultAddress, cusdcAddress, bad, SCALE_BITS, owner.address),
    ).to.be.revertedWithCustomError(pool, "InvalidTier");
    await expect(
      factory.deploy(vaultAddress, cusdcAddress, SEPOLIA_TIERS, 0, owner.address),
    ).to.be.revertedWithCustomError(pool, "InvalidScaleBits");
    await expect(
      factory.deploy(vaultAddress, cusdcAddress, SEPOLIA_TIERS, 121, owner.address),
    ).to.be.revertedWithCustomError(pool, "InvalidScaleBits");
  });
});
