// Statistical fairness of the winner test, measured over a long run on the mock coprocessor. Five savers
// with stakes in a 16:8:4:2:1 ratio hold still through 240 consecutive draws at the Sepolia tier set, a
// 600 second period and a sponsored drip, and every draw is closed, awarded, evaluated to the end of its
// walk, finalized and reconciled. The run measures how many prizes each saver wins against the binomial
// expectation of their share, how many prizes the frequent tier pays against the aggregate's power-of-two
// bracket, that nobody wins more prizes than a tier has, that the over-subscription clamp bites only when
// a tier is claimed past its capacity, and that a saver who arrives after a period ended cannot win that
// period's draw.
// Does not cover: the live relayer or KMS, the statistical quality of FHE.randEuint64 itself (the mock
// draws it, so this measures the winner test given a seed, not the seed), tier sets other than Sepolia's,
// savers who move their balance mid-run (stakes are held still on purpose so the aggregate stays in one
// bracket and every draw is an independent identical trial), the clamp actually biting (five savers can
// claim at most six of the frequent tier's eight prizes, which the run asserts rather than assumes), gas,
// and every book-keeping invariant, which lives in Invariants.ts.
import { FhevmType } from "@fhevm/hardhat-plugin";
import type { HardhatEthersSigner } from "@nomicfoundation/hardhat-ethers/signers";
import { time } from "@nomicfoundation/hardhat-network-helpers";
import { expect } from "chai";
import { ethers, fhevm } from "hardhat";
import type { ConfidentialUSDC, HearthPrizePool, HearthVault, SponsoredYieldSource, TestUSDC } from "../types";

const usd = (whole: number): bigint => BigInt(whole) * 1_000_000n;
const PERIOD = 600n;
const RATE = 65_000n; // 39 USDC a period, so the whole sample stays inside one 10,000 USDC sponsorship
const UINT64_MAX = 2n ** 64n - 1n;

type TierConfig = {
  prizeCount: number;
  oddsNumerator: number;
  oddsDenominator: number;
  shares: number;
  reconcileEvery: number;
};

const SEPOLIA_TIERS: TierConfig[] = [
  { prizeCount: 1, oddsNumerator: 1, oddsDenominator: 24, shares: 40, reconcileEvery: 24 },
  { prizeCount: 1, oddsNumerator: 1, oddsDenominator: 6, shares: 20, reconcileEvery: 6 },
  { prizeCount: 4, oddsNumerator: 1, oddsDenominator: 1, shares: 40, reconcileEvery: 1 },
];

const STAKES = [usd(1_200), usd(600), usd(300), usd(150), usd(75)];
const TOTAL_STAKE = STAKES.reduce((a, b) => a + b, 0n);

// Every saver's observation predates period 2, so from draw 2 on each weight is exactly stake times the
// period and the aggregate is exactly this. 2,325 USDC held for 600 seconds is 1.395e12 balance-seconds,
// which sits between 2^40 and 2^41, so the pool settles at 41 bits and never leaves that bracket.
const AGGREGATE = TOTAL_STAKE * PERIOD;
const SCALE_BITS = bitsFor(AGGREGATE);

// A draw costs about 220 milliseconds on the mock, so the sample is four times the sixty draws the
// design review asked for: at sixty the grand tier expects 1.6 prizes and a run that pays no jackpot at
// all is ordinary, while at 240 it expects 6.3 and both low-odds tiers can be held to paying something.
// The size is overridable because every tolerance below is computed from the run's own measured
// expectations rather than hardcoded, so a reviewer can widen the sample without touching an assertion.
const DRAWS = Number(process.env.HEARTH_FAIRNESS_DRAWS ?? 240);

// Six comparisons are made against this bound, so a per-comparison three standard errors would fail a
// healthy run about once in fifty. Three and a half puts the whole file near one run in 400 and still
// catches the largest saver being paid eight percent off their weight, or the smallest being paid at
// twice or a quarter of theirs. A Monte Carlo of 400 simulated runs put the measured spread of every
// one of these shares within five percent of the error bar computed below, so the bound is the real one.
const SIGMA = 3.5;

function bitsFor(aggregate: bigint): number {
  let bits = 0;
  while (1n << BigInt(bits) < aggregate) bits++;
  return bits;
}

// The two low-odds tiers pay a handful of prizes across the whole run, which is a count too small and
// too skewed for a normal error bar, so they are held to the exact Poisson tails at one in ten thousand
// each side. A Monte Carlo of 400 simulated runs of this exact tier set puts the measured spread of both
// counts within four percent of Poisson, so the tails are the right shape.
function poissonCeiling(mean: number): number {
  let term = Math.exp(-mean);
  let cumulative = term;
  let n = 0;
  while (cumulative < 1 - 1e-4 && n < 1_000) {
    n += 1;
    term *= mean / n;
    cumulative += term;
  }
  return n;
}

function poissonFloor(mean: number): number {
  let term = Math.exp(-mean);
  let cumulative = 0;
  let n = 0;
  while (cumulative + term < 1e-4 && n < 1_000) {
    cumulative += term;
    n += 1;
    term *= mean / n;
  }
  return n;
}

type Params = Awaited<ReturnType<HearthPrizePool["drawParams"]>>;
type Walker = { address: string; twab: bigint };
type Row = { address: string; credit: bigint; wins: number[] };

describe("Hearth fairness", () => {
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
  let frank: HardhatEthersSigner;

  beforeEach(async () => {
    [owner, keeper, alice, bob, carol, dave, erin, frank] = await ethers.getSigners();
  });

  async function deploy(scaleBits: number) {
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
    ).deploy(vaultAddress, cusdcAddress, SEPOLIA_TIERS, scaleBits, owner.address)) as unknown as HearthPrizePool;
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

  async function deposit(who: HardhatEthersSigner, amount: bigint) {
    const input = await fhevm.createEncryptedInput(cusdcAddress, who.address).add64(amount).encrypt();
    await (
      await cusdc
        .connect(who)
        ["confidentialTransferAndCall(address,bytes32,bytes,bytes)"](
          vaultAddress,
          input.handles[0],
          input.inputProof,
          "0x",
        )
    ).wait();
  }

  async function fund(savers: HardhatEthersSigner[], stakes: bigint[]) {
    for (let i = 0; i < savers.length; i++) {
      await wrapFor(savers[i], usd(10_000));
      await deposit(savers[i], stakes[i]);
    }
  }

  // Handles the vault keeps to itself are read through the mock's clear-text store, which no ACL guards.
  // The saver's own path through the relayer is spot-checked once in the run below.
  const reveal = (handle: string) => fhevm.debugger.decryptEuint(FhevmType.euint64, handle);
  const revealOrZero = async (handle: string) => (handle === ethers.ZeroHash ? 0n : reveal(handle));

  async function nextPeriod() {
    const period = await vault.currentPeriod();
    await time.increaseTo((await vault.periodEnd(period)) + 1n);
  }

  async function publish(drawId: number) {
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

  async function award(drawId: number) {
    const p = await publish(drawId);
    await (
      await pool.connect(keeper).awardDraw(drawId, p.seed, p.scaleCount, p.nonEmpty, p.harvested, p.proof)
    ).wait();
    return p;
  }

  async function reconcileTier(tier: number): Promise<bigint> {
    const [handle] = await vault.publishedCarry(tier);
    const published = await fhevm.publicDecrypt([handle]);
    const carry = published.clearValues[handle] as bigint;
    await (await pool.connect(keeper).reconcile(tier, carry, published.decryptionProof)).wait();
    return carry;
  }

  async function evaluateAll(drawId: number, savers: number) {
    for (let call = 0; call < savers; call++) {
      await (await vault.connect(keeper).evaluate(drawId, savers)).wait();
      const [, length] = await vault.walkOf(drawId);
      if ((await vault.cursorOf(drawId)) >= length) return;
    }
    throw new Error(`walk of draw ${drawId} did not finish`);
  }

  async function walkOrder(seed: bigint): Promise<string[]> {
    const length = await vault.saverCount();
    const start = seed % length;
    const order: string[] = [];
    for (let i = 0n; i < length; i++) order.push(await vault.saverAt((start + i) % length));
    return order;
  }

  const remainderOf = (drawId: number) =>
    vault.remainingHandles(drawId).then((handles) => series([...handles], revealOrZero));

  // Mirrors HearthVault._winnerTest against the draw's real opening liquidity, which is the plaintext
  // offered amount plus whatever encrypted carry the open folded in, so the prediction is exact rather
  // than an upper bound. `wins` counts the shots each tier decided in the saver's favour before the
  // clamp, which is what the fairness statistics are measured on.
  function mirror(params: Params, drawId: number, walk: Walker[], opening: bigint[]) {
    const remaining = [...opening];
    const rows: Row[] = [];

    for (const { address, twab } of walk) {
      let credit = 0n;
      const wins: number[] = [];
      for (let tier = 0; tier < 3; tier++) {
        let tierWins = 0;
        for (let k = 0n; k < BigInt(params.prizeCount[tier]); k++) {
          const threshold = thresholdMirror(params, drawId, address, tier, k);
          if (threshold >= UINT64_MAX) break;
          if (twab > threshold) tierWins += 1;
        }
        const claim = BigInt(tierWins) * BigInt(params.prize[tier]);
        const pay = claim < remaining[tier] ? claim : remaining[tier];
        remaining[tier] -= pay;
        credit += pay;
        wins.push(tierWins);
      }
      rows.push({ address, credit, wins });
    }
    return { rows, remaining };
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

  // Expected prizes for one saver in one tier: the count shots are nested, so the number won is the floor
  // or the ceiling of this and its mean is exactly `min(count, twab * odds * count / M)`. The fractional
  // part is the only random bit, which makes the per-draw variance f * (1 - f).
  function expectedPrizes(params: Params, tier: number, twab: bigint): number {
    const range = Math.pow(2, Number(params.scaleBits));
    const y = (Number(twab) * Number(params.zoneMul[tier])) / (Number(params.zoneDiv[tier]) * range);
    return Math.min(Number(params.prizeCount[tier]), y);
  }

  const zeros = () => [0, 0, 0].map(() => STAKES.map(() => 0));

  it("pays each saver a share of the prizes that tracks their share of the pool", async function () {
    this.timeout(45 * 60_000);

    await deploy(SCALE_BITS);
    const savers = [alice, bob, carol, dave, erin];
    await fund(savers, STAKES);
    const index = new Map(savers.map((s, i) => [s.address, i] as const));

    const won = zeros();
    const expectedWins = zeros();
    const variance = zeros();
    const paidPerTier = [0n, 0n, 0n];
    const prizesPerTier = [0, 0, 0];
    const smallestPrize = [UINT64_MAX, UINT64_MAX, UINT64_MAX];
    const largestPrize = [0n, 0n, 0n];
    let scored = 0;
    let clampedDraws = 0;
    let widestFrequentClaim = 0;
    let credited = 0n;
    let checkedAsSaver = false;

    const started = Date.now();
    for (let drawId = 1; drawId <= DRAWS; drawId++) {
      await nextPeriod();

      // The window of draw n ends with period n + 2, so the draw two behind the one about to close is
      // exactly the one ready to fold into the carries. Reconciling before the close puts the frequent
      // tier's unpaid liquidity straight back on offer.
      if (drawId > 2) {
        await (await vault.connect(keeper).finalizeDraw(drawId - 2)).wait();
        for (const tier of [0, 1, 2]) {
          if ((await vault.publishedCarry(tier))[2]) await reconcileTier(tier);
        }
      }

      await (await pool.connect(keeper)["closeDraw(uint32)"](drawId)).wait();
      const opening = await remainderOf(drawId);
      const published = await award(drawId);
      expect(published.nonEmpty, `draw ${drawId} measured an aggregate`).to.equal(true);

      await evaluateAll(drawId, savers.length);
      const params = await pool.drawParams(drawId);
      const order = await walkOrder(published.seed);
      const walk: Walker[] = await series(order, async (address) => ({
        address,
        twab: await revealOrZero(await vault.weightHandle(drawId, address)),
      }));

      const aggregate = walk.reduce((a, w) => a + w.twab, 0n);
      const range = 1n << BigInt(params.scaleBits);
      expect(range, `draw ${drawId} range covers the aggregate`).to.be.at.least(aggregate);
      expect(range, `draw ${drawId} range is inside twice the aggregate`).to.be.lessThan(2n * aggregate);

      const { rows, remaining } = mirror(params, drawId, walk, opening);
      const closing = await remainderOf(drawId);
      expect(closing, `draw ${drawId} remainders`).to.deep.equal(remaining);

      // What one saver could take if they cleared every threshold of every tier. Held against the
      // decrypted credit itself, so the ceiling does not depend on the mirror being right.
      const mostOneSaverCanWin = params.prize.reduce(
        (a, prize, tier) => a + BigInt(prize) * BigInt(params.prizeCount[tier]),
        0n,
      );

      let drawCredit = 0n;
      for (const row of rows) {
        const credit = await revealOrZero(await vault.creditHandle(drawId, row.address));
        expect(credit, `draw ${drawId} credit of ${row.address}`).to.equal(row.credit);
        expect(credit, `draw ${drawId} credit of ${row.address} exceeds every prize on offer`).to.be.at.most(
          mostOneSaverCanWin,
        );
        drawCredit += credit;

        for (let tier = 0; tier < 3; tier++) {
          expect(
            row.wins[tier],
            `draw ${drawId} tier ${tier} gave one saver more prizes than the tier has`,
          ).to.be.at.most(Number(params.prizeCount[tier]));
        }
      }
      credited += drawCredit;
      expect(
        opening.reduce((a, o, t) => a + o - closing[t], 0n),
        `draw ${drawId} paid exactly what it credited`,
      ).to.equal(drawCredit);
      expect(await revealOrZero(await vault.unfundedHandle()), `draw ${drawId} was fully funded`).to.equal(0n);

      if (!checkedAsSaver && drawCredit > 0n) {
        const winner = savers[index.get(rows.find((r) => r.credit > 0n)!.address)!];
        expect(
          await fhevm.userDecryptEuint(
            FhevmType.euint64,
            await vault.creditHandle(drawId, winner.address),
            vaultAddress,
            winner,
          ),
          "a winner reads their own credit through the relayer path, not only the debugger",
        ).to.be.greaterThan(0n);
        checkedAsSaver = true;
      }

      // Draw one offers nothing, because the first close is what books the first harvest. It decides
      // winners all the same, but a prize of zero carries no information, so it stays out of the sample.
      if (drawId === 1) continue;
      scored += 1;

      for (let tier = 0; tier < 3; tier++) {
        expect(BigInt(params.prize[tier]), `draw ${drawId} tier ${tier} has a prize`).to.be.greaterThan(0n);
        let claimed = 0;
        for (const row of rows) {
          const i = index.get(row.address)!;
          const mean = expectedPrizes(params, tier, walk.find((w) => w.address === row.address)!.twab);
          const fraction = mean >= Number(params.prizeCount[tier]) ? 0 : mean - Math.floor(mean);
          expectedWins[tier][i] += mean;
          variance[tier][i] += fraction * (1 - fraction);
          won[tier][i] += row.wins[tier];
          claimed += row.wins[tier];
        }

        const claim = BigInt(claimed) * BigInt(params.prize[tier]);
        const paid = opening[tier] - closing[tier];
        expect(paid, `draw ${drawId} tier ${tier} paid every claim it could cover`).to.equal(
          claim < opening[tier] ? claim : opening[tier],
        );
        if (paid < claim) {
          clampedDraws += 1;
          expect(claimed, `draw ${drawId} tier ${tier} clamped below its capacity`).to.be.greaterThan(
            Number(opening[tier] / BigInt(params.prize[tier])),
          );
        }
        paidPerTier[tier] += paid;
        prizesPerTier[tier] += claimed;
        if (tier === 2) widestFrequentClaim = Math.max(widestFrequentClaim, claimed);
        const size = BigInt(params.prize[tier]);
        if (size < smallestPrize[tier]) smallestPrize[tier] = size;
        if (size > largestPrize[tier]) largestPrize[tier] = size;
      }

      // Half of a tier's liquidity is offered across its prize count, so the frequent tier always covers
      // at least eight of its four nominal prizes before the clamp can bite.
      expect(
        Number(opening[2] / BigInt(params.prize[2])),
        `draw ${drawId} frequent capacity`,
      ).to.be.at.least(8);
    }

    const seconds = Math.round((Date.now() - started) / 1000);
    const nominal = scored * SEPOLIA_TIERS[2].prizeCount;
    const totalWon = won[2].reduce((a, b) => a + b, 0);
    const totalExpected = expectedWins[2].reduce((a, b) => a + b, 0);
    const totalVariance = variance[2].reduce((a, b) => a + b, 0);
    const wOverM = totalExpected / nominal;

    console.log(
      `  ${scored} scored draws in ${seconds}s, frequent tier paid ${totalWon} of ${nominal} nominal prizes ` +
        `(W/M ${wOverM.toFixed(4)}, expected ${totalExpected.toFixed(1)})`,
    );
    for (let i = 0; i < savers.length; i++) {
      const share = won[2][i] / totalWon;
      const stake = Number(STAKES[i]) / Number(TOTAL_STAKE);
      console.log(
        `  saver ${i} stake ${(stake * 100).toFixed(2)}% won ${won[2][i]} frequent prizes, ` +
          `share ${(share * 100).toFixed(2)}%, expected ${expectedWins[2][i].toFixed(1)}`,
      );
    }
    console.log(
      `  grand ${prizesPerTier[0]} prizes / ${Number(paidPerTier[0]) / 1e6} USDC, ` +
        `mid ${prizesPerTier[1]} / ${Number(paidPerTier[1]) / 1e6}, ` +
        `frequent ${prizesPerTier[2]} / ${Number(paidPerTier[2]) / 1e6}, ` +
        `credited ${Number(credited) / 1e6}`,
    );
    for (const tier of [0, 1, 2]) {
      console.log(
        `  tier ${tier} prize size ranged ${Number(smallestPrize[tier]) / 1e6} to ` +
          `${Number(largestPrize[tier]) / 1e6} USDC across the sample`,
      );
    }

    // The aggregate is fixed for the whole sample, so every draw is an independent identical trial and
    // the expected share of the frequent tier's prizes is the stake share exactly: the range M divides
    // out of the ratio. That identity is worth asserting on its own, since it is the fairness claim.
    for (let i = 0; i < savers.length; i++) {
      expect(expectedWins[2][i] / totalExpected, `expected share of saver ${i}`).to.be.closeTo(
        Number(STAKES[i]) / Number(TOTAL_STAKE),
        1e-9,
      );
    }

    // Delta method on X_i / T with the savers independent of each other, so Cov(X_i, T) = Var(X_i).
    for (let i = 0; i < savers.length; i++) {
      const share = expectedWins[2][i] / totalExpected;
      const spread = Math.sqrt(
        (variance[2][i] * (1 - 2 * share) + share * share * totalVariance) / (totalExpected * totalExpected),
      );
      expect(
        Math.abs(won[2][i] / totalWon - share),
        `saver ${i} won ${won[2][i]} of ${totalWon} frequent prizes, ${SIGMA} standard errors is ${(
          SIGMA * spread
        ).toFixed(4)}`,
      ).to.be.at.most(SIGMA * spread);
    }

    // Both gaps are fifteen standard errors wide at this sample, so ordering the ends of the stake range
    // is safe to assert outright. Adjacent stakes are not: 300 against 150 USDC is only two apart.
    expect(won[2][0], "the largest stake wins the most prizes").to.be.greaterThan(won[2][1]);
    expect(won[2][1], "and the second largest beats the smallest").to.be.greaterThan(won[2][4]);

    // A tier pays between half and all of its nominal prizes per draw because M sits between W and 2W.
    expect(wOverM, "the bracket keeps the payout rate above half").to.be.greaterThan(0.5);
    expect(wOverM, "and at or below the nominal count").to.be.at.most(1);
    expect(
      Math.abs(totalWon - totalExpected),
      `the frequent tier paid ${(totalWon / nominal).toFixed(4)} of nominal against W/M ${wOverM.toFixed(4)}`,
    ).to.be.at.most(SIGMA * Math.sqrt(totalVariance));
    expect(totalWon / nominal, "and stayed inside the half-to-all band").to.be.greaterThan(0.45);

    // Five savers can claim at most six frequent prizes in one draw (each wins the floor or the ceiling
    // of their own expectation), and the tier covers eight, so the clamp cannot bite in this sample. The
    // implication is asserted per draw above; this records that the premise never came up.
    expect(widestFrequentClaim, "no draw claimed past the frequent tier's eight prizes").to.be.at.most(8);
    expect(clampedDraws, "so the clamp never bit").to.equal(0);

    // The mid tier expects draws * W / (6M) prizes, about 25 at this sample, and the grand tier a
    // quarter of that, about 6.3. Both are held to the same two-sided Poisson interval, which says
    // something different at each rate: the mid tier's floor is around 8, so a mid tier that pays
    // nothing, or pays at under a third of its odds, fails. The grand tier's floor at this sample size
    // is zero, because a run with no jackpot at all really does happen about one time in 570, so the
    // interval only catches the tier paying too often and the count is reported either way.
    const midExpected = expectedWins[1].reduce((a, b) => a + b, 0);
    const grandExpected = expectedWins[0].reduce((a, b) => a + b, 0);
    console.log(
      `  grand tier paid ${prizesPerTier[0]} against ${grandExpected.toFixed(2)} expected, inside ` +
        `[${poissonFloor(grandExpected)}, ${poissonCeiling(grandExpected)}]; mid tier ` +
        `${prizesPerTier[1]} against ${midExpected.toFixed(2)}, inside ` +
        `[${poissonFloor(midExpected)}, ${poissonCeiling(midExpected)}]`,
    );
    expect(prizesPerTier[1], `the mid tier expected ${midExpected.toFixed(2)} prizes`).to.be.at.least(
      poissonFloor(midExpected),
    );
    expect(prizesPerTier[1]).to.be.at.most(poissonCeiling(midExpected));
    expect(poissonFloor(midExpected), "and a mid tier that paid nothing would fail that floor").to.be.at.least(1);
    expect(prizesPerTier[0], `the grand tier expected ${grandExpected.toFixed(2)} prizes`).to.be.at.least(
      poissonFloor(grandExpected),
    );
    expect(prizesPerTier[0]).to.be.at.most(poissonCeiling(grandExpected));
    expect(paidPerTier[2], "the frequent tier moved real money").to.be.greaterThan(0n);
    expect(credited, "and every prize landed as a credit").to.equal(
      paidPerTier[0] + paidPerTier[1] + paidPerTier[2],
    );
  });

  it("never pays a saver for a period that ended before they arrived", async () => {
    await deploy(SCALE_BITS);
    await fund([alice, bob], [usd(1_200), usd(600)]);

    await nextPeriod();
    await (await pool.connect(keeper)["closeDraw(uint32)"](1)).wait();
    await award(1);

    // Frank's first observation lands in period 3, after period 2 has ended, so draw 2 must skip him in
    // plaintext while draw 3 must weigh him for the part of period 3 he was present.
    await nextPeriod();
    await fund([frank], [usd(3_000)]);
    expect(await vault.periodOf(await vault.firstObservationAt(frank.address))).to.equal(3);

    await (await pool.connect(keeper)["closeDraw(uint32)"](2)).wait();
    await award(2);
    await evaluateAll(2, 3);

    expect(await vault.evaluated(2, frank.address), "the late saver is marked done").to.equal(true);
    expect(await vault.weightHandle(2, frank.address), "with no weight").to.equal(ethers.ZeroHash);
    expect(await vault.creditHandle(2, frank.address), "and no credit").to.equal(ethers.ZeroHash);
    expect(await revealOrZero(await vault.confidentialWinningsOf(frank.address))).to.equal(0n);
    const paidToOthers = await series([alice, bob], async (who) =>
      revealOrZero(await vault.confidentialWinningsOf(who.address)),
    );
    expect(paidToOthers.reduce((a, b) => a + b, 0n), "while the savers present were paid").to.be.greaterThan(0n);

    await nextPeriod();
    await (await pool.connect(keeper)["closeDraw(uint32)"](3)).wait();
    await award(3);
    await evaluateAll(3, 3);
    expect(
      await revealOrZero(await vault.weightHandle(3, frank.address)),
      "and the next draw weighs him for the part of the period he held a balance",
    ).to.be.greaterThan(0n);
  });
});
