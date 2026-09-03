// Book-keeping invariants under a seeded pseudo-random sequence of actions. Six savers deposit and
// withdraw random amounts across twenty-seven periods while the draw lifecycle runs beside them: closes,
// awards, partial and complete evaluation walks, evaluation a period late but still inside the window,
// finalization, per-tier reconciliation, one draw whose close never lands, and one award that lands
// after its window and so is Skipped. After every action the run re-derives, from the mock's clear-text
// store, that the vault holds exactly principal plus winnings, that the pool holds exactly its plaintext
// liquidity plus every encrypted carry plus every open draw's remainder plus every harvest it has taken
// but not yet booked, that no remainder ever exceeds what its draw was opened with, that nobody has
// received more than they put in plus what they were credited, that the unfunded counter stays at zero,
// and that the published scale keeps the range between the aggregate and twice it.
// Which saver acts and what they do is fixed by the seed and reproduces exactly. How much they withdraw
// follows the balance they hold, and that moves with the prizes, because the per-draw seed comes from
// the coprocessor and is different every run. That is the point: these invariants hold for every seed.
// Does not cover: the live relayer or KMS, statistical fairness of the winner test (Fairness.ts), gas or
// compute-unit budgets, deposits above the per-saver cap, the pause path, a hostile token, a saver whose
// kept history runs out inside a draw's window (three slots shift at most once per period, which makes
// that unreachable), and the exact amounts the winner test decides, which this file treats as arbitrary.
import { FhevmType } from "@fhevm/hardhat-plugin";
import type { HardhatEthersSigner } from "@nomicfoundation/hardhat-ethers/signers";
import { time } from "@nomicfoundation/hardhat-network-helpers";
import { expect } from "chai";
import { ethers, fhevm } from "hardhat";
import type { ConfidentialUSDC, HearthPrizePool, HearthVault, SponsoredYieldSource, TestUSDC } from "../types";

const usd = (whole: number): bigint => BigInt(whole) * 1_000_000n;
const PERIOD = 600n;
const RATE = 200_000n; // 120 USDC a period, well inside one 10,000 USDC sponsorship

const CLOSED = 1n;
const AWARDED = 2n;
const SKIPPED = 4n;

const LONG_CADENCE_TIERS = [
  { prizeCount: 1, oddsNumerator: 1, oddsDenominator: 24, shares: 40, reconcileEvery: 24 },
  { prizeCount: 1, oddsNumerator: 1, oddsDenominator: 6, shares: 20, reconcileEvery: 6 },
  { prizeCount: 4, oddsNumerator: 1, oddsDenominator: 1, shares: 40, reconcileEvery: 1 },
];

const OPENING_STAKES = [usd(400), usd(350), usd(300), usd(250), usd(200), usd(150)];

// Long enough for draw 24 to finalize, which is the only way the grand tier's 24-draw reconcile cadence
// is ever exercised against a carry that really did ride along for 24 draws.
const PERIODS = 27;

// Draw 7's close never happens, so it stays None and its period pays nothing. Seven is picked because it
// is a multiple of neither the grand tier's 24 nor the mid tier's 6, so skipping it costs no long cadence
// reconciliation, and the frequent tier's carry is simply published at draw 8 instead. Draw 3 is closed
// on time and awarded three periods later, after its window, so it is Skipped and hands its liquidity
// back.
const NEVER_CLOSED = 7;
const AWARDED_LATE = 3;

// One fixed seed, so the action sequence is the same on every machine and a failure can be replayed.
const ACTION_SEED = 0x48454152;

function mulberry32(seed: number): () => number {
  let state = seed >>> 0;
  return () => {
    state = (state + 0x6d2b79f5) >>> 0;
    let t = Math.imul(state ^ (state >>> 15), 1 | state);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function bitsFor(aggregate: bigint): number {
  let bits = 0;
  while (1n << BigInt(bits) < aggregate) bits++;
  return bits;
}

describe("Hearth invariants", () => {
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
  let savers: HardhatEthersSigner[];

  const random = mulberry32(ACTION_SEED);

  // What the run has to remember between checks: what each draw was opened with, what harvest the pool
  // took at its close and has not booked yet, and the last remainder seen, which may never grow.
  const opening = new Map<number, bigint[]>();
  const harvestAtClose = new Map<number, bigint>();
  const lastRemainder = new Map<number, bigint[]>();
  const closed: number[] = [];
  const counted = new Set<string>();

  let sentToVault: bigint[];
  let receivedFromVault: bigint[];
  let credited: bigint[];
  let checks = 0;
  let nonEmptyDraws = 0;

  // The seed is fixed, but a sequence that happened to never withdraw everything, or never leave a walk
  // half done, would still pass every assertion below while covering less than it claims. These count
  // what the run actually did and are asserted at the end.
  const did = { deposit: 0, withdraw: 0, withdrawAll: 0, partialWalk: 0, lateWalk: 0, scale: 0 };
  const reconciled = [0, 0, 0];

  before(async () => {
    const signers = await ethers.getSigners();
    [owner, keeper] = signers;
    savers = signers.slice(2, 8);
    sentToVault = savers.map(() => 0n);
    receivedFromVault = savers.map(() => 0n);
    credited = savers.map(() => 0n);
  });

  // The mock coprocessor advances a single shared event cursor per decryption request and is not
  // re-entrant, so two decryptions in flight at once make it re-read a block it has already parsed.
  const reveal = (handle: string) => fhevm.debugger.decryptEuint(FhevmType.euint64, handle);
  const revealOrZero = async (handle: string) => (handle === ethers.ZeroHash ? 0n : reveal(handle));

  const walletOf = async (who: HardhatEthersSigner) =>
    revealOrZero(await cusdc.confidentialBalanceOf(who.address));
  const principalOf = async (who: HardhatEthersSigner) =>
    revealOrZero(await vault.confidentialBalanceOf(who.address));
  const winningsOf = async (who: HardhatEthersSigner) =>
    revealOrZero(await vault.confidentialWinningsOf(who.address));

  async function remainderOf(drawId: number): Promise<bigint[]> {
    const handles = await vault.remainingHandles(drawId);
    const out: bigint[] = [];
    for (const handle of handles) out.push(await revealOrZero(handle));
    return out;
  }

  async function deploy() {
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

    const aggregate = OPENING_STAKES.reduce((a, b) => a + b, 0n) * PERIOD;
    pool = (await (
      await ethers.getContractFactory("HearthPrizePool")
    ).deploy(
      vaultAddress,
      cusdcAddress,
      LONG_CADENCE_TIERS,
      bitsFor(aggregate),
      owner.address,
    )) as unknown as HearthPrizePool;
    poolAddress = await pool.getAddress();

    source = (await (
      await ethers.getContractFactory("SponsoredYieldSource")
    ).deploy(cusdcAddress, poolAddress, RATE, owner.address)) as unknown as SponsoredYieldSource;

    await (await vault.connect(owner).setPrizePool(poolAddress)).wait();
    await (await pool.connect(owner).setYieldSource(await source.getAddress())).wait();

    await (await usdc.connect(owner).claim()).wait();
    await (await usdc.connect(owner).approve(await source.getAddress(), usd(10_000))).wait();
    await (await source.connect(owner).sponsor(usd(10_000))).wait();

    for (const saver of savers) {
      await (await usdc.connect(saver).claim()).wait();
      await (await usdc.connect(saver).approve(cusdcAddress, usd(10_000))).wait();
      await (await cusdc.connect(saver).wrap(saver.address, usd(10_000))).wait();
    }
  }

  async function deposit(index: number, amount: bigint) {
    const who = savers[index];
    const before = await walletOf(who);
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
    sentToVault[index] += before - (await walletOf(who));
  }

  async function withdraw(index: number, amount: bigint | "all") {
    const who = savers[index];
    const before = await walletOf(who);
    if (amount === "all") {
      await (await vault.connect(who).withdrawAll()).wait();
    } else {
      const input = await fhevm.createEncryptedInput(vaultAddress, who.address).add64(amount).encrypt();
      await (await vault.connect(who).withdraw(input.handles[0], input.inputProof)).wait();
    }
    receivedFromVault[index] += (await walletOf(who)) - before;
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

  async function close(drawId: number) {
    const carriesBefore = await series([0, 1, 2], async (t) => revealOrZero(await vault.carryHandle(t)));
    const pendingBefore = await series([0, 1, 2], async (t) => (await vault.publishedCarry(t))[2]);
    await (await pool.connect(keeper)["closeDraw(uint32)"](drawId)).wait();

    const params = await pool.drawParams(drawId);
    const opened = await remainderOf(drawId);
    for (let tier = 0; tier < 3; tier++) {
      // A carry awaiting reconciliation stays where it is; anything else is folded into the draw.
      const absorbed = pendingBefore[tier] ? 0n : carriesBefore[tier];
      expect(opened[tier], `draw ${drawId} tier ${tier} opened with offered plus carry`).to.equal(
        BigInt(params.offered[tier]) + absorbed,
      );
    }
    opening.set(drawId, opened);
    lastRemainder.set(drawId, opened);
    harvestAtClose.set(drawId, await revealOrZero((await pool.drawOf(drawId)).harvestHandle));
    closed.push(drawId);
  }

  async function award(drawId: number) {
    const published = await publish(drawId);
    expect(published.harvested, `draw ${drawId} harvest handle`).to.equal(harvestAtClose.get(drawId));
    await (
      await pool
        .connect(keeper)
        .awardDraw(
          drawId,
          published.seed,
          published.scaleCount,
          published.nonEmpty,
          published.harvested,
          published.proof,
        )
    ).wait();
    harvestAtClose.set(drawId, 0n);
    if (published.nonEmpty) nonEmptyDraws += 1;
    return published;
  }

  async function evaluate(drawId: number, count: number) {
    await (await vault.connect(keeper).evaluate(drawId, count)).wait();
    const savedCount = Number(await vault.saverCount());
    for (let i = 0; i < savedCount; i++) {
      const address = await vault.saverAt(i);
      const key = `${drawId}:${address}`;
      if (counted.has(key) || !(await vault.evaluated(drawId, address))) continue;
      counted.add(key);
      const index = savers.findIndex((s) => s.address === address);
      if (index >= 0) credited[index] += await revealOrZero(await vault.creditHandle(drawId, address));
    }
  }

  async function series<T, R>(items: T[], each: (item: T) => Promise<R>): Promise<R[]> {
    const out: R[] = [];
    for (const item of items) out.push(await each(item));
    return out;
  }

  async function check(label: string) {
    checks += 1;

    let owed = 0n;
    for (const saver of savers) owed += (await principalOf(saver)) + (await winningsOf(saver));
    expect(
      await revealOrZero(await cusdc.confidentialBalanceOf(vaultAddress)),
      `${label}: the vault holds principal plus winnings`,
    ).to.equal(owed);

    let booked = 0n;
    for (const tier of [0, 1, 2]) {
      booked += await pool.liquidity(tier);
      booked += await revealOrZero(await vault.carryHandle(tier));
    }
    const live: number[] = [];
    for (const drawId of closed) {
      const status = (await pool.drawParams(drawId)).status;
      const settled = await vault.finalized(drawId);
      // A harvest lands in the pool at the close and is booked into the tiers at the award, so between
      // the two it belongs to no tier and no draw. The architecture's invariant names this term; without
      // it the pool looks over-funded for exactly as long as an award is outstanding.
      if (status === CLOSED) booked += harvestAtClose.get(drawId)!;
      // A draw that is finalized and past its award holds nothing and owes nothing, so it drops out of
      // the scan for good rather than being walked again on every one of the run's two hundred checks.
      if (status !== CLOSED && settled) continue;
      live.push(drawId);
      if (settled) continue;

      const remainder = await remainderOf(drawId);
      const opened = opening.get(drawId)!;
      const previous = lastRemainder.get(drawId)!;
      for (let tier = 0; tier < 3; tier++) {
        // The lower half of the bound needs no assertion, since a remainder is a uint64 and cannot go
        // below zero. What it can do is wrap, and a wrapped subtraction lands far above what the draw
        // was opened with, so the upper bound is where an underflow would show up.
        expect(remainder[tier], `${label}: draw ${drawId} tier ${tier} is inside what it was opened with`)
          .to.be.at.most(opened[tier]);
        expect(remainder[tier], `${label}: draw ${drawId} tier ${tier} only ever falls`).to.be.at.most(
          previous[tier],
        );
        booked += remainder[tier];
      }
      lastRemainder.set(drawId, remainder);
    }
    closed.length = 0;
    closed.push(...live);
    expect(
      await revealOrZero(await cusdc.confidentialBalanceOf(poolAddress)),
      `${label}: the pool holds liquidity plus carries plus open draws plus unbooked harvests`,
    ).to.equal(booked);

    expect(await revealOrZero(await vault.unfundedHandle()), `${label}: nothing went unfunded`).to.equal(0n);

    for (let i = 0; i < savers.length; i++) {
      expect(
        receivedFromVault[i],
        `${label}: saver ${i} took out more than they put in plus their prizes`,
      ).to.be.at.most(sentToVault[i] + credited[i]);
    }
  }

  // The aggregate of a period is the sum of every saver's weight for it, so it can only be read off a
  // walk that finished. A draw nobody finished, or one that measured nothing, says nothing about the
  // scale and is left alone.
  async function checkScale(drawId: number): Promise<string> {
    const params = await pool.drawParams(drawId);
    if (params.status !== AWARDED) return "";

    let aggregate = 0n;
    const count = Number(await vault.saverCount());
    for (let i = 0; i < count; i++) {
      const address = await vault.saverAt(i);
      if (!(await vault.evaluated(drawId, address))) return "";
      aggregate += await revealOrZero(await vault.weightHandle(drawId, address));
    }
    if (aggregate === 0n) return "";

    const range = 1n << BigInt(params.scaleBits);
    if (nonEmptyDraws >= 3) {
      expect(range, `draw ${drawId}: the range covers the aggregate`).to.be.at.least(aggregate);
      expect(range, `draw ${drawId}: and stays inside twice it`).to.be.lessThan(2n * aggregate);
      did.scale += 1;
    }
    return `W/M ${(Number((aggregate * 1000n) / range) / 1000).toFixed(3)}`;
  }

  async function actions(period: number) {
    const rounds = 1 + Math.floor(random() * 3);
    for (let round = 0; round < rounds; round++) {
      const index = Math.floor(random() * savers.length);
      const roll = random();
      const principal = await principalOf(savers[index]);

      if (roll < 0.55 || principal === 0n) {
        const amount = usd(50 + Math.floor(random() * 350));
        await deposit(index, amount);
        did.deposit += 1;
        await check(`period ${period} deposit by saver ${index}`);
        continue;
      }

      const holders = await series(savers, principalOf);
      if (roll > 0.85 && holders.filter((p) => p > 0n).length > 2) {
        await withdraw(index, "all");
        did.withdrawAll += 1;
        await check(`period ${period} withdrawAll by saver ${index}`);
        continue;
      }

      // A fraction of what they hold, so the aggregate walks smoothly and the scale tracker, which
      // moves at most two bits down or three up per draw, is never asked to catch a jump it cannot.
      const amount = (principal * BigInt(10 + Math.floor(random() * 40))) / 100n;
      await withdraw(index, amount);
      did.withdraw += 1;
      await check(`period ${period} withdraw by saver ${index}`);
    }
  }

  async function nextPeriod() {
    const period = await vault.currentPeriod();
    await time.increaseTo((await vault.periodEnd(period)) + 1n);
  }

  it("keeps every balance, remainder and carry accounted for under a random sequence of actions", async function () {
    this.timeout(30 * 60_000);
    await deploy();

    const started = Date.now();
    for (let period = 1; period <= PERIODS; period++) {
      expect(await vault.currentPeriod(), "the loop stays on its own schedule").to.equal(period);

      if (period === 1) {
        for (let i = 0; i < savers.length; i++) {
          await deposit(i, OPENING_STAKES[i]);
          await check(`period 1 opening stake of saver ${i}`);
        }
      } else {
        await actions(period);
      }

      const drawId = period - 1;
      let note = "";

      if (drawId >= 1 && drawId !== NEVER_CLOSED) {
        await close(drawId);
        await check(`period ${period} close of draw ${drawId}`);

        if (drawId !== AWARDED_LATE) {
          const published = await award(drawId);
          await check(`period ${period} award of draw ${drawId}`);
          note = published.nonEmpty ? `draw ${drawId} awarded` : `draw ${drawId} empty`;

          if ((await pool.drawParams(drawId)).status === AWARDED) {
            // Half the draws are walked to the end straight away and half are left for the next period,
            // which is what a keeper that runs out of gas or a saver advancing the walk looks like.
            const complete = random() < 0.5;
            let calls = 0;
            while (complete && calls < savers.length) {
              await evaluate(drawId, savers.length);
              await check(`period ${period} evaluate of draw ${drawId}`);
              calls += 1;
              const [, length] = await vault.walkOf(drawId);
              if ((await vault.cursorOf(drawId)) >= length) break;
            }
            if (!complete) {
              await evaluate(drawId, 2);
              did.partialWalk += 1;
              await check(`period ${period} partial evaluate of draw ${drawId}`);
            }
            note += ` ${await vault.evaluatedCount(drawId)}/${await vault.saverCount()} evaluated`;
          }
        } else {
          note = `draw ${drawId} closed, award held back`;
        }
      }

      // The draw before this one is still inside its window, one period on. Finishing its walk here is
      // the late-but-legal path, and it is the only place a draw awarded last period gets completed.
      const older = drawId - 1;
      if (older >= 1 && (await pool.drawParams(older)).status === AWARDED) {
        const [, length] = await vault.walkOf(older);
        if (length === 0n || (await vault.cursorOf(older)) < length) {
          await evaluate(older, savers.length);
          did.lateWalk += 1;
          await check(`period ${period} late evaluate of draw ${older}`);
        }
        const scale = await checkScale(older);
        if (scale) note += ` ${scale}`;
      }

      if (period === AWARDED_LATE + 3) {
        await award(AWARDED_LATE);
        expect((await pool.drawParams(AWARDED_LATE)).status, "an award past the window is skipped").to.equal(
          SKIPPED,
        );
        expect(await vault.finalized(AWARDED_LATE), "and hands its liquidity straight back").to.equal(true);
        await check(`period ${period} late award of draw ${AWARDED_LATE}`);
        note += ` draw ${AWARDED_LATE} skipped`;
      }

      for (const older of [...closed]) {
        if (period <= older + 2) continue;
        if (await vault.finalized(older)) continue;
        if ((await pool.drawParams(older)).status !== AWARDED) continue;

        await (await vault.connect(keeper).finalizeDraw(older)).wait();
        await check(`period ${period} finalize of draw ${older}`);
        for (const tier of [0, 1, 2]) {
          if (!(await vault.publishedCarry(tier))[2]) continue;
          const [handle] = await vault.publishedCarry(tier);
          const decrypted = await fhevm.publicDecrypt([handle]);
          const carry = decrypted.clearValues[handle] as bigint;
          await (await pool.connect(keeper).reconcile(tier, carry, decrypted.decryptionProof)).wait();
          reconciled[tier] += 1;
          await check(`period ${period} reconcile of tier ${tier}`);
        }
        note += ` draw ${older} finalized`;
      }

      const liquidity = (await series([0, 1, 2], (t) => pool.liquidity(t))).reduce((a, b) => a + b, 0n);
      const carries = (await series([0, 1, 2], async (t) => revealOrZero(await vault.carryHandle(t)))).reduce(
        (a, b) => a + b,
        0n,
      );
      const held = await revealOrZero(await cusdc.confidentialBalanceOf(vaultAddress));
      console.log(
        `  period ${String(period).padStart(2)}  ${note.padEnd(46)} vault ${(Number(held) / 1e6).toFixed(2)} ` +
          `liquidity ${(Number(liquidity) / 1e6).toFixed(2)} carry ${(Number(carries) / 1e6).toFixed(2)}`,
      );

      if (period < PERIODS) await nextPeriod();
    }

    expect((await pool.drawParams(NEVER_CLOSED)).status, "a draw nobody closed stays untouched").to.equal(0n);
    expect(await vault.opened(NEVER_CLOSED), "and never took any liquidity").to.equal(false);
    expect((await pool.drawParams(AWARDED_LATE)).status).to.equal(SKIPPED);
    expect(nonEmptyDraws, "the run measured a real aggregate most periods").to.be.at.least(8);
    expect(checks, "and checked the books after every action").to.be.at.least(60);
    expect(did.deposit, "the sequence deposited").to.be.at.least(10);
    expect(did.withdraw, "withdrew part of a balance").to.be.at.least(4);
    expect(did.withdrawAll, "emptied a balance").to.be.at.least(1);
    expect(did.partialWalk, "left a walk half done").to.be.at.least(2);
    expect(did.lateWalk, "finished one a period later, still inside the window").to.be.at.least(2);
    expect(did.scale, "and read the scale off a finished walk").to.be.at.least(5);
    expect(reconciled[2], "the frequent tier reconciled every draw").to.be.at.least(10);
    expect(reconciled[1], "the mid tier on its six draw cadence").to.be.at.least(2);
    expect(reconciled[0], "and the grand tier on its twenty four").to.be.at.least(1);

    // Every saver leaves, which is the strongest form of the vault invariant: the token balance the
    // savers' encrypted ledger claimed is exactly the token balance they can walk away with.
    for (let i = 0; i < savers.length; i++) {
      const owed = (await principalOf(savers[i])) + (await winningsOf(savers[i]));
      if (owed === 0n) continue;
      await withdraw(i, "all");
      await check(`exit of saver ${i}`);
    }
    expect(
      await revealOrZero(await cusdc.confidentialBalanceOf(vaultAddress)),
      "the vault is empty once every saver has left",
    ).to.equal(0n);

    const paidOut = receivedFromVault.reduce((a, b) => a + b, 0n);
    const paidIn = sentToVault.reduce((a, b) => a + b, 0n);
    const prizes = credited.reduce((a, b) => a + b, 0n);
    console.log(
      `  ${checks} checks over ${PERIODS} periods, deposited ${(Number(paidIn) / 1e6).toFixed(2)} USDC, ` +
        `withdrew ${(Number(paidOut) / 1e6).toFixed(2)}, credited ${(Number(prizes) / 1e6).toFixed(2)}, ` +
        `${Math.round((Date.now() - started) / 1000)}s`,
    );
    expect(paidOut, "and every unit that left was principal or a prize").to.equal(paidIn + prizes);
  });
});
