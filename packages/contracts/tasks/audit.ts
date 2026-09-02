import { FhevmType, type FhevmTypeEuint } from "@fhevm/hardhat-plugin";
import { FhevmHandle } from "@fhevm/mock-utils";
import type { HardhatEthersSigner } from "@nomicfoundation/hardhat-ethers/signers";
import { Interface, type Contract, type ContractTransactionReceipt, type ContractTransactionResponse } from "ethers";
import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { task } from "hardhat/config";
import type { HardhatRuntimeEnvironment } from "hardhat/types";
import {
  FIRST_SAVER_ACCOUNT,
  KEEPER_ACCOUNT,
  TIER_NAMES,
  asBigint,
  asBoolean,
  at,
  chainNow,
  driveDraw,
  group,
  load,
  obtain,
  publicDecrypt,
  send,
  statusName,
  usd,
  userDecrypt,
  walkComplete,
  warp,
  type Hearth,
} from "./hearth";

/**
 * Executes every check in the table "What is checked, and how" of docs/security/threat-model.md,
 * row by row and in the same order, against a live deployment. Each row prints PASS with the
 * evidence, FAIL with what happened, or NOT RUN with the reason. Nothing is skipped silently and
 * the whole transcript is written to docs/security/attacks.
 *
 * Every attack below is what an outsider could do: a random wallet, a saver's own key, or the
 * public keeper steps. The three places where the run uses something an outsider does not have
 * (the local clock, the owner key for the yield source, and the local mock's clear-text store) are
 * named on the line that uses them.
 */

const AWARDED = 2;
const SKIPPED = 4;

/** How far back the row helpers look for a draw worth attacking. */
const LOOKBACK = 24;

/** A wallet that has never touched Hearth, used for the flash deposit. */
const FLASH_ACCOUNT = 7;
const FLASH_STAKE = 1_000_000_000n;
const FLASH_SECONDS = 30n;

const FAKE_SAVERS = 25;
const FAKE_GAS = "0.02";

/** The saver kept in the pool while the bracket is walked down for the over-subscription row. */
const DUST_ACCOUNT = 6;
const TOP_UP = 3_000_000_000n;
const SEED_STAKES = [1_200, 600, 300, 150, 75].map((whole) => BigInt(whole) * 1_000_000n);
const SPONSORSHIP = 10_000_000_000n;
const FAUCET_COOLDOWN = 8n * 60n * 60n;

/** Below this the tiers have too little on offer for an over-subscribed tier to mean anything. */
const MINIMUM_PRIZE_LIQUIDITY = 100_000_000n;

type Verdict = "PASS" | "FAIL" | "NOT RUN";

type RowResult = {
  readonly row: string;
  readonly claim: string;
  readonly verdict: Verdict;
  readonly summary: string;
};

type Audit = {
  readonly hre: HardhatRuntimeEnvironment;
  readonly ctx: Hearth;
  readonly signers: HardhatEthersSigner[];
  readonly keeper: HardhatEthersSigner;
  readonly local: boolean;
  readonly rows: RowResult[];
};

let openRow: { row: string; claim: string } | null = null;

function begin(row: string, claim: string): void {
  openRow = { row, claim };
  console.log("");
  console.log(`Row ${row}. ${claim}`);
}

function detail(text: string): void {
  console.log(`  ${text}`);
}

function finish(a: Audit, verdict: Verdict, summary: string): void {
  const { row, claim } = openRow ?? { row: "?", claim: "?" };
  console.log(`  ${verdict}: ${summary}`);
  a.rows.push({ row, claim, verdict, summary });
  openRow = null;
}

/** Every failure an attack row cares about arrives as a rejected promise, so this is the shape. */
async function refused(call: () => Promise<unknown>): Promise<string | null> {
  try {
    await call();
    return null;
  } catch (error) {
    return describe(error);
  }
}

/**
 * A revert thrown by one of Zama's protocol contracts is not in Hearth's ABI, so ethers hands back
 * raw return data. These are matched by their own four-byte selector, which is what names them.
 */
const PROTOCOL_ERRORS = new Interface([
  "error KMSInvalidSigner(address signer)",
  "error KMSSignatureThresholdNotReached(uint256 signatures)",
  "error KMSZeroSignature()",
  "error SenderNotAllowed(address sender)",
  "error ACLNotAllowed(bytes32 handle, address account)",
  "error InvalidSigner(address signer)",
]);

function describe(error: unknown): string {
  const shaped = error as {
    revert?: { name: string; args: readonly unknown[] } | null;
    data?: string;
    shortMessage?: string;
    message?: string;
  };
  if (shaped.revert) {
    const args = shaped.revert.args.map((value) => String(value)).join(", ");
    return `${shaped.revert.name}(${args})`;
  }

  const message = (shaped.shortMessage ?? shaped.message ?? String(error)).split("\n")[0].trim();
  const named = message.match(/custom error '([^']+)'/);
  if (named) return named[1];

  // Hardhat's provider errors carry a structured `data`, so only a hex string is usable here.
  const field = typeof shaped.data === "string" && shaped.data.startsWith("0x") ? shaped.data : undefined;
  const data = field ?? message.match(/return data: (0x[0-9a-fA-F]+)/)?.[1];
  if (data !== undefined && data.length >= 10) {
    const parsed = PROTOCOL_ERRORS.parseError(data);
    if (parsed) return `${parsed.name}(${parsed.args.map((value) => String(value)).join(", ")})`;
    return `a revert with the unnamed selector ${data.slice(0, 10)}`;
  }
  return message;
}

function ratio(part: bigint, whole: bigint): string {
  if (whole === 0n) return "n/a";
  const basisPoints = (part * 1_000_000n) / whole;
  return `${(Number(basisPoints) / 10_000).toFixed(4)}%`;
}

function powerOfTwo(bits: number | bigint): bigint {
  return 1n << BigInt(bits);
}

async function currentPeriod(a: Audit): Promise<number> {
  return Number(await a.ctx.vault.currentPeriod());
}

async function liquidityTotal(a: Audit): Promise<bigint> {
  let total = 0n;
  for (let tier = 0; tier < TIER_NAMES.length; tier++) total += await a.ctx.pool.liquidity(tier);
  return total;
}

async function liquidityOf(a: Audit): Promise<bigint[]> {
  const tiers: bigint[] = [];
  for (let tier = 0; tier < TIER_NAMES.length; tier++) tiers.push(await a.ctx.pool.liquidity(tier));
  return tiers;
}

/** Only the local mock keeps clear texts, so every caller of this says so on the line it prints. */
async function peek(a: Audit, handle: string, type: FhevmTypeEuint = FhevmType.euint64): Promise<bigint | null> {
  if (!a.local || handle === a.hre.ethers.ZeroHash) return null;
  try {
    return await a.hre.fhevm.debugger.decryptEuint(type, handle);
  } catch {
    return null;
  }
}

async function warpTo(a: Audit, when: bigint, why: string): Promise<void> {
  const now = await chainNow(a.hre);
  if (when > now) await warp(a.hre, when - now + 1n);
  detail(`moved the local clock to ${at(await chainNow(a.hre))}, period ${await currentPeriod(a)}, ${why}`);
}

async function warpToNextPeriod(a: Audit, why: string): Promise<void> {
  const period = await a.ctx.vault.currentPeriod();
  await warpTo(a, await a.ctx.vault.periodEnd(period), why);
}

type Search = {
  readonly evaluated?: boolean;
  readonly unfinished?: boolean;
  readonly funded?: boolean;
  readonly holder?: string;
};

async function newestAwarded(a: Audit, search: Search = {}): Promise<number | null> {
  const period = await currentPeriod(a);
  for (let drawId = period; drawId >= Math.max(1, period - LOOKBACK); drawId--) {
    const draw = await a.ctx.pool.drawOf(drawId);
    if (Number(draw.status) !== AWARDED) continue;
    const complete = await walkComplete(a.ctx.vault, drawId);
    if (search.evaluated && !complete) continue;
    if (search.unfinished && complete) continue;
    if (search.funded && !draw.offered.some((value) => value > 0n)) continue;
    if (search.holder && (await a.ctx.vault.weightHandle(drawId, search.holder)) === a.hre.ethers.ZeroHash) {
      continue;
    }
    return drawId;
  }
  return null;
}

/**
 * Drives whole draws until one matches, which is only ever needed locally. On a live network the
 * rows read whatever the keeper has already produced.
 */
async function ensureAwarded(a: Audit, search: Search, passes = 3): Promise<number | null> {
  let found = await newestAwarded(a, search);
  for (let pass = 0; pass < passes && found === null && a.local; pass++) {
    await warpToNextPeriod(a, "so the period being drawn is over");
    await driveDraw(a.ctx, a.keeper);
    found = await newestAwarded(a, search);
  }
  return found;
}

async function closeDraw(a: Audit, drawId: number): Promise<ContractTransactionReceipt> {
  return send(
    `  closed draw ${drawId}`,
    a.ctx.pool.connect(a.keeper)["closeDraw(uint32)"](drawId) as Promise<ContractTransactionResponse>,
  );
}

type Award = { readonly seed: bigint; readonly scaleCount: bigint; readonly nonEmpty: boolean; readonly harvested: bigint; readonly proof: string };

async function readAward(a: Audit, drawId: number): Promise<Award> {
  const draw = await a.ctx.pool.drawOf(drawId);
  const published = await publicDecrypt(a.hre, [
    draw.seedHandle,
    draw.scaleHandle,
    draw.nonEmptyHandle,
    draw.harvestHandle,
  ]);
  return {
    seed: asBigint(published.values[0], "the draw seed"),
    scaleCount: asBigint(published.values[1], "the scale count"),
    nonEmpty: asBoolean(published.values[2], "the non-empty flag"),
    harvested: asBigint(published.values[3], "the harvest"),
    proof: published.proof,
  };
}

async function awardDraw(a: Audit, drawId: number): Promise<Award> {
  const award = await readAward(a, drawId);
  await send(
    `  awarded draw ${drawId} against a KMS-signed seed of ${award.seed}`,
    a.ctx.pool
      .connect(a.keeper)
      .awardDraw(drawId, award.seed, award.scaleCount, award.nonEmpty, award.harvested, award.proof),
  );
  return award;
}

/** Close plus award without evaluating, which is what the rows that need a fresh draw want. */
async function closeAndAward(a: Audit, drawId: number): Promise<number | null> {
  await closeDraw(a, drawId);
  await awardDraw(a, drawId);
  const status = Number((await a.ctx.pool.drawOf(drawId)).status);
  if (status !== AWARDED) detail(`draw ${drawId} came out ${statusName(status)}, not awarded`);
  return status === AWARDED ? drawId : null;
}

async function evaluateToTheEnd(a: Audit, drawId: number, batch: number): Promise<{ calls: number; gas: bigint }> {
  let calls = 0;
  let gas = 0n;
  for (let pass = 0; pass < 128; pass++) {
    if (await walkComplete(a.ctx.vault, drawId)) break;
    const before = await a.ctx.vault.cursorOf(drawId);
    const receipt = await a.ctx.vault.connect(a.keeper).evaluate(drawId, batch);
    const mined = await receipt.wait();
    if (mined === null) throw new Error("an evaluate call did not confirm");
    calls += 1;
    gas += mined.gasUsed;
    const after = await a.ctx.vault.cursorOf(drawId);
    if (after === before) break;
  }
  return { calls, gas };
}

async function wrapOnly(a: Audit, who: HardhatEthersSigner, amount: bigint): Promise<void> {
  const address = await who.getAddress();
  await send(
    `  approved the wrapper to take ${usd(amount)} USDC from ${address}`,
    (a.ctx.underlying.connect(who) as Contract).approve(a.ctx.addresses.asset, amount),
  );
  await send(
    `  wrapped ${usd(amount)} USDC for ${address}`,
    (a.ctx.asset.connect(who) as Contract).wrap(address, amount),
  );
}

/** Split out of the wrap because the flash deposit has to land seconds before the period ends. */
async function depositOnly(a: Audit, who: HardhatEthersSigner, amount: bigint): Promise<ContractTransactionReceipt> {
  const address = await who.getAddress();
  const input = await a.hre.fhevm.createEncryptedInput(a.ctx.addresses.asset, address).add64(amount).encrypt();
  return send(
    `  deposited an encrypted amount for ${address}`,
    (a.ctx.asset.connect(who) as Contract)["confidentialTransferAndCall(address,bytes32,bytes,bytes)"](
      a.ctx.addresses.vault,
      input.handles[0],
      input.inputProof,
      "0x",
    ),
  );
}

async function saverIndexOf(a: Audit, address: string): Promise<number | null> {
  const count = Number(await a.ctx.vault.saverCount());
  for (let index = 0; index < count; index++) {
    if ((await a.ctx.vault.saverAt(index)).toLowerCase() === address.toLowerCase()) return index;
  }
  return null;
}

/** What the public thresholds alone say a saver won, before the vault clamps to what a tier has left. */
async function uncapped(a: Audit, drawId: number, address: string, weight: bigint): Promise<bigint[]> {
  const params = await a.ctx.pool.drawParams(drawId);
  const perTier: bigint[] = [];
  for (let tier = 0; tier < TIER_NAMES.length; tier++) {
    let owed = 0n;
    for (let index = 0; index < Number(params.prizeCount[tier]); index++) {
      const [threshold, skipped] = await a.ctx.vault.thresholdOf(drawId, address, tier, index);
      if (skipped) break;
      if (weight > threshold) owed += params.prize[tier];
    }
    perTier.push(owed);
  }
  return perTier;
}

// Row 1. A stranger cannot read a saver's values.
async function rowStranger(a: Audit): Promise<void> {
  begin("1", "A stranger cannot read a saver's principal, winnings, weight and credit");
  const saver = a.signers[FIRST_SAVER_ACCOUNT];
  const address = await saver.getAddress();
  const drawId = await ensureAwarded(a, { evaluated: true, holder: address });
  if (drawId === null) {
    finish(a, "NOT RUN", `no awarded draw holds a weight for the saver at account index ${FIRST_SAVER_ACCOUNT} yet`);
    return;
  }

  const vault = a.ctx.addresses.vault;
  const handles: [string, string][] = [
    ["principal", await a.ctx.vault.confidentialBalanceOf(address)],
    ["winnings", await a.ctx.vault.confidentialWinningsOf(address)],
    [`weight in draw ${drawId}`, await a.ctx.vault.weightHandle(drawId, address)],
    [`credit in draw ${drawId}`, await a.ctx.vault.creditHandle(drawId, address)],
  ];

  const own = await userDecrypt(a.hre, handles[2][1], vault, saver);
  detail(`the saver at ${address} reads their own weight in draw ${drawId}: ${group(own)} balance-seconds`);

  const stranger = a.hre.ethers.Wallet.createRandom().connect(a.hre.ethers.provider);
  detail(`a wallet that has never touched Hearth, ${stranger.address}, asks the same four handles`);

  let refusals = 0;
  let missing = 0;
  for (const [what, handle] of handles) {
    if (handle === a.hre.ethers.ZeroHash) {
      missing += 1;
      detail(`${what}: no handle exists, so there is nothing to ask for`);
      continue;
    }
    const message = await refused(() =>
      a.hre.fhevm.userDecryptEuint(FhevmType.euint64, handle, vault, stranger),
    );
    if (message === null) {
      detail(`${what}: READ by the stranger, which must never happen`);
      continue;
    }
    refusals += 1;
    detail(`${what} (${handle}): ${message}`);
  }

  if (refusals === handles.length) {
    finish(a, "PASS", `all four handles refused the stranger, and the saver read their own weight of ${group(own)}`);
  } else {
    finish(a, "FAIL", `${refusals} of ${handles.length} handles refused the stranger, ${missing} did not exist`);
  }
}

// Row 2. The pool's exact total is not obtainable.
async function rowAggregate(a: Audit): Promise<void> {
  begin("2", "The pool's exact total time-weighted balance is not obtainable");
  const vault = a.ctx.addresses.vault;

  // The aggregate has no getter, so the attacker reads the handle straight out of storage the way
  // an archive node would. It is the only euint128 the vault stores, which is what pins the slot.
  let slot = -1;
  let handle = "";
  for (let candidate = 0; candidate < 64 && slot < 0; candidate++) {
    const word = await a.hre.ethers.provider.getStorage(vault, candidate);
    if (word === a.hre.ethers.ZeroHash) continue;
    try {
      if (FhevmHandle.fromBytes32Hex(word).fhevmType === FhevmType.euint128) {
        slot = candidate;
        handle = word;
      }
    } catch {
      continue;
    }
  }
  if (slot < 0) {
    finish(a, "NOT RUN", "no euint128 handle is in the vault's storage yet, so the aggregate has never been written");
    return;
  }

  const balanceWord = await a.hre.ethers.provider.getStorage(vault, slot + 1);
  const stampWord = await a.hre.ethers.provider.getStorage(vault, slot + 2);
  detail(`the pool's aggregate lives in storage slot ${slot} of the vault as ${handle}, a euint128 with no getter`);
  detail(
    `slot ${slot + 1} holds the matching total balance handle and slot ${slot + 2} its timestamp, ` +
      `${at(BigInt(stampWord))}, which is what identifies the three words`,
  );

  const stranger = a.hre.ethers.Wallet.createRandom().connect(a.hre.ethers.provider);
  const asStranger = await refused(() =>
    a.hre.fhevm.userDecryptEuint(FhevmType.euint128, handle, vault, stranger),
  );
  const asOwner = await refused(() =>
    a.hre.fhevm.userDecryptEuint(FhevmType.euint128, handle, vault, a.signers[0]),
  );
  detail(`a fresh wallet ${stranger.address} asks for it: ${asStranger ?? "READ IT, which must never happen"}`);
  detail(`the deployer and owner ${await a.signers[0].getAddress()} asks for it: ${asOwner ?? "READ IT, which must never happen"}`);

  const secret = await peek(a, handle, FhevmType.euint128);
  if (secret !== null) {
    detail(
      `for this run only, the local mock's own clear-text store says the number is ${group(secret)} balance-seconds; ` +
        `that store does not exist on Sepolia and no wallet can reach it through the protocol`,
    );
  }
  detail(`the balance handle in slot ${slot + 1} is ${balanceWord}`);

  // The claim is about differencing two published brackets, so a pool that has only ever run one
  // draw needs a second one before there is anything to difference.
  for (let pass = 0; pass < 2 && a.local && (await publishedBrackets(a)).length < 2; pass++) {
    await warpToNextPeriod(a, "so a second draw publishes its own bracket");
    await driveDraw(a.ctx, a.keeper);
  }
  const brackets = (await publishedBrackets(a)).slice(0, 2);

  if (brackets.length === 2) {
    const [newer, older] = brackets;
    const newRange = powerOfTwo(newer.bits);
    const oldRange = powerOfTwo(older.bits);
    const perPeriod = (value: bigint): string => usd(value / a.ctx.periodLength);
    detail(
      `draw ${older.drawId} published 2^${older.bits} and draw ${newer.drawId} published 2^${newer.bits}, ` +
        "which is everything the chain says about either total",
    );
    detail(
      `so the older total sits in (${group(oldRange / 2n)}, ${group(oldRange)}] balance-seconds and the newer in ` +
        `(${group(newRange / 2n)}, ${group(newRange)}]`,
    );
    detail(
      `the move between them is bounded to (${perPeriod(newRange / 2n - oldRange)}, ${perPeriod(newRange - oldRange / 2n)}) ` +
        "USDC held for a whole period, a factor-of-two band and not a number",
    );
  } else {
    detail(`only ${brackets.length} awarded draw is on chain, so the bracket difference has nothing to compare against yet`);
  }

  if (asStranger === null || asOwner === null) {
    finish(a, "FAIL", "the aggregate handle was readable by a wallet that should not have it");
  } else if (brackets.length === 2) {
    finish(
      a,
      "PASS",
      `the aggregate handle refused both a random wallet and the owner, and the two published brackets bound the move between them to a factor-of-two band`,
    );
  } else {
    finish(
      a,
      "PASS",
      "the aggregate handle refused both a random wallet and the owner; the bracket difference needs two awarded draws and this pool has one",
    );
  }
}

async function publishedBrackets(a: Audit): Promise<{ drawId: number; bits: number }[]> {
  const period = await currentPeriod(a);
  const found: { drawId: number; bits: number }[] = [];
  for (let drawId = period; drawId >= Math.max(1, period - LOOKBACK); drawId--) {
    const draw = await a.ctx.pool.drawOf(drawId);
    if (Number(draw.status) !== AWARDED) continue;
    found.push({ drawId, bits: Number(draw.scaleBits) });
  }
  return found;
}

// Row 3. A flash deposit earns almost nothing.
async function rowFlashDeposit(a: Audit): Promise<void> {
  begin("3", "A flash deposit earns almost nothing");
  if (!a.local) {
    finish(a, "NOT RUN", "the deposit has to land a fixed number of seconds before a period ends, which needs the local clock");
    return;
  }

  const flash = a.signers[FLASH_ACCOUNT];
  const flashAddress = await flash.getAddress();
  const holder = a.signers[FIRST_SAVER_ACCOUNT];
  const holderAddress = await holder.getAddress();

  await obtain(a.ctx, flash, FLASH_STAKE);
  await wrapOnly(a, flash, FLASH_STAKE);

  const period = await currentPeriod(a);
  const ends = await a.ctx.vault.periodEnd(period);
  await warpTo(a, ends - FLASH_SECONDS - 2n, `so the deposit lands ${FLASH_SECONDS} seconds before period ${period} ends`);
  const receipt = await depositOnly(a, flash, FLASH_STAKE);
  const block = await a.hre.ethers.provider.getBlock(receipt.blockNumber);
  if (block === null) throw new Error("the node returned no block for the flash deposit");
  const held = ends - BigInt(block.timestamp);
  detail(`the deposit landed at ${at(BigInt(block.timestamp))}, ${held} seconds before period ${period} ended`);

  await warpToNextPeriod(a, "so the draw for that period can be closed");
  for (let pass = 0; pass < 3 && Number((await a.ctx.pool.drawOf(period)).status) !== AWARDED; pass++) {
    await driveDraw(a.ctx, a.keeper);
  }
  if (Number((await a.ctx.pool.drawOf(period)).status) !== AWARDED) {
    finish(a, "NOT RUN", `draw ${period} could not be awarded, so there is no weight to compare`);
    return;
  }
  if (!(await walkComplete(a.ctx.vault, period))) await evaluateToTheEnd(a, period, 4);

  const vault = a.ctx.addresses.vault;
  const flashWeight = await userDecrypt(a.hre, await a.ctx.vault.weightHandle(period, flashAddress), vault, flash);
  const holderWeight = await userDecrypt(a.hre, await a.ctx.vault.weightHandle(period, holderAddress), vault, holder);
  const holderStake = await userDecrypt(a.hre, await a.ctx.vault.confidentialBalanceOf(holderAddress), vault, holder);

  detail(
    `the flash wallet decrypted its own weight for draw ${period}: ${group(flashWeight)} balance-seconds from ` +
      `${usd(FLASH_STAKE)} USDC held for ${held} seconds`,
  );
  detail(
    `the full-period holder decrypted theirs: ${group(holderWeight)} balance-seconds from ${usd(holderStake)} USDC ` +
      `held for all ${a.ctx.periodLength} seconds`,
  );

  const exact = FLASH_STAKE * held;
  const bound = (holderWeight * held * FLASH_STAKE) / (a.ctx.periodLength * holderStake);
  detail(
    `the flash wallet brought ${ratio(FLASH_STAKE, holderStake)} of the other saver's money and came away with ` +
      `${ratio(flashWeight, holderWeight)} of its odds`,
  );
  detail(`the time-weighted ceiling for that stake and that many seconds is ${group(bound)} balance-seconds`);

  if (flashWeight === exact && flashWeight <= bound) {
    finish(
      a,
      "PASS",
      `the flash weight is exactly stake times seconds held, ${group(flashWeight)}, which is ${ratio(flashWeight, holderWeight)} of a full-period holder's`,
    );
  } else {
    finish(a, "FAIL", `the flash weight is ${group(flashWeight)} against an expected ${group(exact)} and a ceiling of ${group(bound)}`);
  }
}

// Row 4. Fake savers cannot stall a draw.
async function rowFakeSavers(a: Audit): Promise<void> {
  begin("4", "Fake savers cannot stall a draw");
  if (!a.local) {
    finish(a, "NOT RUN", `registering ${FAKE_SAVERS} addresses and running the whole walk against them is a local-only expense`);
    return;
  }

  const deployer = a.signers[0];
  const before = Number(await a.ctx.vault.saverCount());
  const fakes: HardhatEthersSigner[] = [];
  detail(`registering ${FAKE_SAVERS} addresses that hold nothing, through the deposit hook, which is the only way in`);
  for (let index = 0; index < FAKE_SAVERS; index++) {
    const wallet = a.hre.ethers.Wallet.createRandom().connect(a.hre.ethers.provider);
    const funding = await deployer.sendTransaction({
      to: wallet.address,
      value: a.hre.ethers.parseEther(FAKE_GAS),
    });
    await funding.wait();
    const input = await a.hre.fhevm.createEncryptedInput(a.ctx.addresses.asset, wallet.address).add64(0n).encrypt();
    const tx = await (a.ctx.asset.connect(wallet) as Contract)[
      "confidentialTransferAndCall(address,bytes32,bytes,bytes)"
    ](a.ctx.addresses.vault, input.handles[0], input.inputProof, "0x");
    await tx.wait();
    fakes.push(wallet as unknown as HardhatEthersSigner);
  }

  const after = Number(await a.ctx.vault.saverCount());
  const registered = await a.ctx.vault.isSaver(fakes[0].address);
  detail(`the saver list went from ${before} to ${after} addresses, and isSaver of the first fake reads ${registered}`);

  const period = await currentPeriod(a);
  await warpToNextPeriod(a, `so draw ${period}, the first draw the fakes are in the walk of, can be closed`);
  const drawId = await closeAndAward(a, period);
  if (drawId === null) {
    finish(a, "NOT RUN", `draw ${period} did not come out awarded, so the walk could not be run`);
    return;
  }

  const walked = await evaluateToTheEnd(a, drawId, 4);
  const walk = await a.ctx.vault.walkOf(drawId);
  const cursor = await a.ctx.vault.cursorOf(drawId);
  const evaluated = await a.ctx.vault.evaluatedCount(drawId);
  detail(
    `draw ${drawId} evaluated ${evaluated} of ${walk.count} savers in ${walked.calls} calls for ${group(walked.gas)} gas, ` +
      `about ${group(walked.gas / BigInt(Math.max(1, Number(walk.count))))} gas a saver`,
  );

  const vault = a.ctx.addresses.vault;
  let zeroWeights = 0;
  for (const fake of fakes.slice(0, 3)) {
    const weight = await userDecrypt(a.hre, await a.ctx.vault.weightHandle(drawId, fake.address), vault, fake);
    if (weight === 0n) zeroWeights += 1;
    detail(`the fake saver ${fake.address} decrypted its own weight for draw ${drawId}: ${group(weight)}`);
  }

  const complete = cursor >= walk.count && walk.count > 0n;
  if (complete && zeroWeights === 3 && after === before + FAKE_SAVERS) {
    finish(
      a,
      "PASS",
      `${FAKE_SAVERS} empty addresses joined the list, the walk still finished all ${walk.count} savers in ${walked.calls} calls for ${group(walked.gas)} gas, and every fake weighs zero`,
    );
  } else {
    finish(a, "FAIL", `the walk reached ${cursor} of ${walk.count} savers and ${zeroWeights} of 3 sampled fakes weighed zero`);
  }
}

// Row 5. Nobody can choose who is evaluated.
async function rowAiming(a: Audit): Promise<void> {
  begin("5", "Nobody can choose who is evaluated");
  let drawId = await newestAwarded(a, { unfinished: true });
  if (drawId === null && a.local) {
    const period = await currentPeriod(a);
    await warpToNextPeriod(a, "so a fresh draw is available to walk");
    drawId = await closeAndAward(a, period);
  }
  if (drawId === null) {
    finish(a, "NOT RUN", "no awarded draw with an unfinished walk exists on this network right now");
    return;
  }

  const caller = a.signers[3];
  const callerAddress = await caller.getAddress();
  const params = await a.ctx.pool.drawParams(drawId);
  const savers = await a.ctx.vault.saverCount();
  const walkBefore = await a.ctx.vault.walkOf(drawId);
  const cursorBefore = await a.ctx.vault.cursorOf(drawId);
  const length = walkBefore.count === 0n ? savers : walkBefore.count;
  const start = params.seed % length;
  const target = await a.ctx.vault.saverAt((start + cursorBefore) % length);
  const callerIndex = await saverIndexOf(a, callerAddress);

  detail(`draw ${drawId} has seed ${params.seed}, so its walk starts at index ${start} of ${length} savers`);
  detail(`walkOf before: start ${walkBefore.start}, count ${walkBefore.count}; cursorOf before: ${cursorBefore}`);
  detail("walkOf reads zeros until the first evaluate call fixes it from the seed and the saver count");
  detail(`the caller is the saver at account index 3, ${callerAddress}, who sits at list index ${callerIndex}`);
  detail(`the next saver the walk owes work to is ${target}`);

  await send(
    `  ${callerAddress} called evaluate(${drawId}, 1) from their own key`,
    a.ctx.vault.connect(caller).evaluate(drawId, 1),
  );

  const walkAfter = await a.ctx.vault.walkOf(drawId);
  const cursorAfter = await a.ctx.vault.cursorOf(drawId);
  const targetDone = await a.ctx.vault.evaluated(drawId, target);
  const callerDone = await a.ctx.vault.evaluated(drawId, callerAddress);
  detail(`walkOf after: start ${walkAfter.start}, count ${walkAfter.count}; cursorOf after: ${cursorAfter}`);
  detail(`the seed-derived saver ${target} is now evaluated: ${targetDone}`);
  detail(`the caller is evaluated: ${callerDone}, and the caller is ${target.toLowerCase() === callerAddress.toLowerCase() ? "who the seed picked anyway" : "not who the seed picked"}`);

  const aimed = callerDone && target.toLowerCase() !== callerAddress.toLowerCase();
  if (walkAfter.start === start && cursorAfter === cursorBefore + 1n && targetDone && !aimed) {
    finish(
      a,
      "PASS",
      `the call advanced the seed-derived walk from ${cursorBefore} to ${cursorAfter} and paid out to ${target}, not to the caller`,
    );
  } else {
    finish(a, "FAIL", `the walk moved from ${cursorBefore} to ${cursorAfter} with start ${walkAfter.start} against a seed-derived ${start}`);
  }
}

// Row 6. A late close is refused.
async function rowLateClose(a: Audit): Promise<void> {
  begin("6", "A late close is refused and the draw costs nothing");
  if (!a.local) {
    finish(a, "NOT RUN", "letting a close deadline pass without closing needs the local clock");
    return;
  }

  const target = await currentPeriod(a);
  const deadline = await a.ctx.pool.closeDeadline(target);
  detail(`draw ${target} is the draw for the period running now, and its close deadline is ${at(deadline)}`);
  await warpTo(a, deadline, `so draw ${target} is past its close deadline and nobody closed it`);

  const before = await liquidityOf(a);
  const message = await refused(() => a.ctx.pool.connect(a.keeper)["closeDraw(uint32)"](target));
  detail(`closeDraw(${target}) from the keeper: ${message ?? "SUCCEEDED, which must never happen"}`);
  const after = await liquidityOf(a);
  const status = Number((await a.ctx.pool.drawOf(target)).status);
  const finalize = await refused(() => a.ctx.vault.connect(a.keeper).finalizeDraw(target));

  detail(`tier liquidity before ${before.map(usd).join(" / ")} USDC and after ${after.map(usd).join(" / ")} USDC`);
  detail(`draw ${target} reads ${statusName(status)}, and finalizeDraw(${target}) answers ${finalize ?? "SUCCEEDED"}`);
  detail(
    "a draw whose close never landed keeps that status for ever: its liquidity was never moved into it, and the " +
      "Skipped status is only for a draw that was closed and awarded late, which row 7 runs",
  );

  const unchanged = before.every((value, tier) => value === after[tier]);
  if (message !== null && message.includes("CloseWindowClosed") && unchanged && status === 0 && finalize !== null) {
    finish(a, "PASS", `the late close reverted ${message}, the draw still reads ${statusName(status)} and no tier lost a unit`);
  } else {
    finish(a, "FAIL", `the late close answered ${message ?? "success"} and the draw reads ${statusName(status)}`);
  }
}

// Row 7. A missed award loses nothing.
async function rowMissedAward(a: Audit): Promise<void> {
  begin("7", "A missed award loses nothing");
  if (!a.local) {
    finish(a, "NOT RUN", "letting a whole evaluation window pass before awarding needs the local clock");
    return;
  }

  let closable = Number(await a.ctx.pool.closableDraw());
  if (closable === 0) {
    await warpToNextPeriod(a, "so a draw becomes closable");
    closable = Number(await a.ctx.pool.closableDraw());
  }
  if (closable === 0) {
    finish(a, "NOT RUN", "no draw is closable, so there is nothing to leave unawarded");
    return;
  }

  await closeDraw(a, closable);
  const offered = (await a.ctx.pool.drawParams(closable)).offered.map((value) => BigInt(value));
  const offeredTotal = offered.reduce((total, value) => total + value, 0n);
  detail(`draw ${closable} closed with ${usd(offeredTotal)} USDC of tier liquidity moved into it`);

  await warpTo(a, await a.ctx.pool.windowEndsAt(closable), `so the whole window of draw ${closable} passed with no award`);
  const before = await liquidityTotal(a);
  const award = await awardDraw(a, closable);
  const after = await liquidityTotal(a);
  const status = Number((await a.ctx.pool.drawOf(closable)).status);
  const finalized = await a.ctx.vault.finalized(closable);

  detail(`the late award booked a harvest of ${usd(award.harvested)} USDC and marked the draw ${statusName(status)}`);
  detail(`tier liquidity went from ${usd(before)} to ${usd(after)} USDC, which is the ${usd(offeredTotal)} offered plus the harvest`);
  detail(`the vault reads the draw as finalized: ${finalized}, so nothing is left riding on it`);

  if (status === SKIPPED && after === before + offeredTotal + award.harvested && finalized) {
    finish(
      a,
      "PASS",
      `the draw reads Skipped, every one of the ${usd(offeredTotal)} USDC offered is back in the tiers and the ${usd(award.harvested)} USDC harvest was still booked`,
    );
  } else {
    finish(a, "FAIL", `the draw reads ${statusName(status)} and liquidity moved from ${usd(before)} to ${usd(after)} USDC`);
  }
}

// Row 8. A reverting yield source does not stop the clock.
async function rowBrokenYield(a: Audit): Promise<void> {
  begin("8", "A reverting yield source does not stop the clock");
  if (!a.local) {
    finish(a, "NOT RUN", "pointing the pool at a broken source needs the owner key and a deploy, so it is kept to the local chain");
    return;
  }

  const owner = a.signers[0];
  const original = await a.ctx.pool.yieldSource();
  const broken = await (await a.hre.ethers.getContractFactory("RevertingYieldSource", owner)).deploy();
  await broken.waitForDeployment();
  const brokenAddress = await broken.getAddress();
  await send(`  pointed the pool at a yield source that always reverts, ${brokenAddress}`, a.ctx.pool.connect(owner).setYieldSource(brokenAddress));

  let closable = Number(await a.ctx.pool.closableDraw());
  if (closable === 0) {
    await warpToNextPeriod(a, "so a draw becomes closable");
    closable = Number(await a.ctx.pool.closableDraw());
  }
  if (closable === 0) {
    await send("  put the working yield source back", a.ctx.pool.connect(owner).setYieldSource(original));
    finish(a, "NOT RUN", "no draw was closable while the broken source was attached");
    return;
  }

  const receipt = await closeDraw(a, closable);
  const failures = receipt.logs.filter((entry) => {
    try {
      return a.ctx.pool.interface.parseLog(entry)?.name === "HarvestFailed";
    } catch {
      return false;
    }
  });
  const status = Number((await a.ctx.pool.drawOf(closable)).status);
  const award = await readAward(a, closable);
  detail(`the close succeeded and emitted HarvestFailed ${failures.length} time(s) for draw ${closable}`);
  detail(`the draw reads ${statusName(status)} and its harvest handle publicly decrypts to ${usd(award.harvested)} USDC`);

  await send("  put the working yield source back", a.ctx.pool.connect(owner).setYieldSource(original));
  await awardDraw(a, closable);

  if (failures.length === 1 && status === 1 && award.harvested === 0n) {
    finish(a, "PASS", `the close went through with a source that reverts, emitted HarvestFailed and booked a zero harvest`);
  } else {
    finish(a, "FAIL", `the close emitted ${failures.length} HarvestFailed events and booked ${usd(award.harvested)} USDC`);
  }
}

// Row 9. An over-subscribed tier clamps rather than overpaying.
async function rowOverSubscribed(a: Audit): Promise<void> {
  begin("9", "An over-subscribed tier clamps rather than overpaying");
  if (!a.local) {
    finish(a, "NOT RUN", "forcing more winners than a tier can fund needs the local clock to walk the published bracket down first");
    return;
  }

  const savers = SEED_STAKES.map((_, index) => a.signers[FIRST_SAVER_ACCOUNT + index]);
  const dust = a.signers[DUST_ACCOUNT];
  const vault = a.ctx.addresses.vault;

  // The clamp can only bite when savers are worth several times the published bracket, and the
  // bracket only moves three bits a draw. Emptying the pool except for one dust holder walks it
  // down, and the top-up then jumps it far above what the tracker can follow in one step. Every
  // account this run has deposited from has to be emptied, or the leftovers hold the bracket up.
  detail(
    "a tier only over-subscribes when savers are worth several times the published bracket, and the bracket " +
      "follows the pool within three bits a draw, so the case is built by emptying the pool, letting the bracket " +
      "walk down to one small holder, and then putting far more back than one draw can follow",
  );
  detail("emptying every saver but one so the published bracket walks down to the dust holder");
  const dustAddress = await dust.getAddress();
  for (const account of [...savers, a.signers[FLASH_ACCOUNT]]) {
    const address = await account.getAddress();
    if (address === dustAddress || !(await a.ctx.vault.isSaver(address))) continue;
    await send(`  ${address} withdrew everything`, a.ctx.vault.connect(account).withdrawAll());
  }

  await warpToNextPeriod(a, "so the first shrunken period starts clean");
  let bits = Number(await a.ctx.pool.scaleBits());
  detail(`the pool publishes a bracket of 2^${bits} right now`);
  for (let pass = 0; pass < 8; pass++) {
    await warpToNextPeriod(a, "so the shrunken period is over");
    const drawId = (await currentPeriod(a)) - 1;
    if (Number((await a.ctx.pool.drawOf(drawId)).status) !== 0) continue;
    await closeAndAward(a, drawId);
    const moved = Number(await a.ctx.pool.scaleBits());
    detail(`  draw ${drawId} moved the bracket to 2^${moved}`);
    if (moved === bits) break;
    bits = moved;
  }

  // A tier with nothing on offer has nothing to clamp, so top the sponsorship up when the drip has
  // run dry. Sponsoring is public and touches nothing about who wins.
  if ((await a.ctx.source.harvestable()) + (await liquidityTotal(a)) < MINIMUM_PRIZE_LIQUIDITY) {
    const owner = a.signers[0];
    await warp(a.hre, FAUCET_COOLDOWN + 1n);
    detail("the drip has run dry, so the clock moved past the faucet cooldown to refill the sponsorship");
    try {
      await obtain(a.ctx, owner, SPONSORSHIP);
      await send(
        `  approved the source to take ${usd(SPONSORSHIP)} USDC`,
        (a.ctx.underlying.connect(owner) as Contract).approve(a.ctx.addresses.source, SPONSORSHIP),
      );
      await send(
        `  sponsored ${usd(SPONSORSHIP)} USDC so the tiers have something to over-subscribe`,
        a.ctx.source.connect(owner).sponsor(SPONSORSHIP),
      );
    } catch (error) {
      detail(`the sponsorship could not be refilled: ${describe(error)}`);
    }
  }

  await warpToNextPeriod(a, "so the top-ups all count for a whole period");
  detail(`every saver now deposits ${usd(TOP_UP)} USDC, which is far more than the published bracket can follow in one draw`);
  for (const saver of savers) {
    await obtain(a.ctx, saver, TOP_UP);
    await wrapOnly(a, saver, TOP_UP);
    await depositOnly(a, saver, TOP_UP);
  }

  await warpToNextPeriod(a, "so the top-up period is over and its draw can run");
  const drawId = (await currentPeriod(a)) - 1;
  const carryBefore: bigint[] = [];
  for (let tier = 0; tier < TIER_NAMES.length; tier++) {
    carryBefore.push((await peek(a, await a.ctx.vault.carryHandle(tier))) ?? 0n);
  }
  if (Number((await a.ctx.pool.drawOf(drawId)).status) !== 0) {
    finish(a, "NOT RUN", `draw ${drawId} was already closed, so the over-subscribed case could not be built`);
    return;
  }
  const awarded = await closeAndAward(a, drawId);
  if (awarded === null) {
    finish(a, "NOT RUN", `draw ${drawId} did not come out awarded, so no tier could be over-subscribed`);
    return;
  }
  await evaluateToTheEnd(a, drawId, 4);

  const params = await a.ctx.pool.drawParams(drawId);
  const offered = params.offered.map((value) => BigInt(value));
  detail(
    `draw ${drawId} runs against 2^${params.scaleBits} with prizes of ${params.prize.map((value) => usd(value)).join(" / ")} USDC ` +
      `and ${offered.map(usd).join(" / ")} USDC on offer`,
  );

  const owed = [0n, 0n, 0n];
  let credited = 0n;
  for (const saver of savers) {
    const address = await saver.getAddress();
    const weight = await userDecrypt(a.hre, await a.ctx.vault.weightHandle(drawId, address), vault, saver);
    const credit = await userDecrypt(a.hre, await a.ctx.vault.creditHandle(drawId, address), vault, saver);
    const perTier = await uncapped(a, drawId, address, weight);
    for (let tier = 0; tier < TIER_NAMES.length; tier++) owed[tier] += perTier[tier];
    credited += credit;
    detail(
      `${address} weighs ${group(weight)}, the public thresholds owe it ${usd(perTier.reduce((x, y) => x + y, 0n))} USDC ` +
        `and the vault credited ${usd(credit)} USDC`,
    );
  }

  const remaining = await a.ctx.vault.remainingHandles(drawId);
  let clamped = false;
  let overpaid = false;
  for (let tier = 0; tier < TIER_NAMES.length; tier++) {
    const left = (await peek(a, remaining[tier])) ?? 0n;
    const available = offered[tier] + carryBefore[tier];
    const paid = available - left;
    if (owed[tier] > available) clamped = true;
    if (paid > available) overpaid = true;
    detail(
      `the ${TIER_NAMES[tier]} tier had ${usd(available)} USDC available, the thresholds asked it for ${usd(owed[tier])} USDC, ` +
        `it paid ${usd(paid)} USDC and has ${usd(left)} USDC left`,
    );
  }
  detail("the available and remaining figures on those three lines come from the local mock's clear-text store, which does not exist on Sepolia");

  const total = offered.reduce((x, y) => x + y, 0n) + carryBefore.reduce((x, y) => x + y, 0n);
  detail(`savers were credited ${usd(credited)} USDC in total against ${usd(total)} USDC the draw held`);

  await restorePool(a, savers);

  if (clamped && !overpaid && credited <= total) {
    finish(
      a,
      "PASS",
      `the thresholds asked for ${usd(owed.reduce((x, y) => x + y, 0n))} USDC, the draw held ${usd(total)} USDC and paid ${usd(credited)} USDC, never more`,
    );
  } else if (!clamped) {
    finish(
      a,
      "NOT RUN",
      `no tier could be pushed past what it had on offer even after the bracket was walked down, so the clamp never bit; the unit test "matches an off-chain mirror of every threshold, and pays what the mirror says" in test/Hearth.ts checks the same arithmetic including the clamp`,
    );
  } else {
    finish(a, "FAIL", `a tier paid more than it held: credited ${usd(credited)} USDC against ${usd(total)} USDC available`);
  }
}

/** Puts the demo pool back the way hearth:seed left it, so a run does not spoil the next demo. */
async function restorePool(a: Audit, savers: HardhatEthersSigner[]): Promise<void> {
  detail("putting the seeded stakes back so the local pool looks the way hearth:seed left it");
  for (let index = 0; index < savers.length; index++) {
    const saver = savers[index];
    await send(`  ${await saver.getAddress()} withdrew everything`, a.ctx.vault.connect(saver).withdrawAll());
    await depositOnly(a, saver, SEED_STAKES[index]);
  }
}

// Row 10. A proof cannot be replayed.
async function rowProofReplay(a: Audit): Promise<void> {
  begin("10", "An award proof cannot be replayed against another draw");
  const pool = a.ctx.pool;
  const deployment = await a.hre.deployments.get("HearthPrizePool");
  const from = deployment.receipt?.blockNumber ?? 0;
  const to = await a.hre.ethers.provider.getBlockNumber();
  const events = await queryChunked(a, from, to);
  if (events.length === 0) {
    finish(a, "NOT RUN", "no draw has been awarded on this network yet, so there is no proof to steal");
    return;
  }

  const latest = events[events.length - 1];
  const transaction = await a.hre.ethers.provider.getTransaction(latest.transactionHash);
  if (transaction === null) {
    finish(a, "NOT RUN", `the award transaction ${latest.transactionHash} is no longer served by this node`);
    return;
  }
  const call = pool.interface.parseTransaction({ data: transaction.data });
  if (call === null || call.name !== "awardDraw") {
    finish(a, "NOT RUN", `the newest award landed through ${call?.name ?? "an unknown call"}, so its proof cannot be lifted from the input`);
    return;
  }

  const [drawId, seed, scaleCount, nonEmpty, harvested, proof] = call.args;
  detail(`lifted the KMS proof of draw ${drawId} out of the public transaction ${latest.transactionHash}`);
  detail(`it carries seed ${seed}, scale count ${scaleCount}, non-empty ${nonEmpty}, harvest ${usd(harvested)} USDC and ${(proof as string).length / 2 - 1} bytes of signatures`);

  let target: number | null = null;
  const period = await currentPeriod(a);
  for (let candidate = period; candidate >= Math.max(1, period - LOOKBACK) && target === null; candidate--) {
    if (candidate === Number(drawId)) continue;
    if (Number((await pool.drawOf(candidate)).status) === 1) target = candidate;
  }
  if (target === null && a.local) {
    const closable = Number(await pool.closableDraw());
    if (closable !== 0 && closable !== Number(drawId)) {
      await closeDraw(a, closable);
      target = closable;
    }
  }

  const sameDraw = await refused(() =>
    pool.connect(a.keeper).awardDraw(drawId, seed, scaleCount, nonEmpty, harvested, proof),
  );
  detail(`resubmitted against its own draw ${drawId}: ${sameDraw ?? "SUCCEEDED, which must never happen"}`);

  if (target === null) {
    finish(
      a,
      sameDraw === null ? "FAIL" : "PASS",
      `no other draw is waiting to be awarded, so the replay could only be tried against the original, which answered ${sameDraw}`,
    );
    return;
  }

  const otherDraw = await refused(() =>
    pool.connect(a.keeper).awardDraw(target, seed, scaleCount, nonEmpty, harvested, proof),
  );
  detail(`resubmitted against draw ${target}, which is closed and waiting for its own proof: ${otherDraw ?? "SUCCEEDED, which must never happen"}`);
  detail(`draw ${target} still reads ${statusName((await pool.drawOf(target)).status)}`);

  if (sameDraw !== null && otherDraw !== null) {
    finish(a, "PASS", `the proof was refused against its own draw (${sameDraw}) and against draw ${target} (${otherDraw})`);
  } else {
    finish(a, "FAIL", `a replayed proof was accepted: own draw ${sameDraw ?? "accepted"}, draw ${target} ${otherDraw ?? "accepted"}`);
  }
}

/** Sepolia's log endpoints cap a range, so the search walks it in blocks rather than one call. */
async function queryChunked(a: Audit, from: number, to: number): Promise<{ transactionHash: string }[]> {
  const filter = a.ctx.pool.filters.DrawAwarded();
  const step = a.local ? to - from + 1 : 9_000;
  const found: { transactionHash: string }[] = [];
  for (let start = from; start <= to; start += step) {
    const end = Math.min(start + step - 1, to);
    found.push(...(await a.ctx.pool.queryFilter(filter, start, end)));
  }
  return found;
}

// Rows 11 and 12. The property tests.
function rowProperties(a: Audit): void {
  begin("11", "Nobody withdraws more than they own");
  detail('covered by the property test "keeps every balance, remainder and carry accounted for under a random sequence of actions" in test/Invariants.ts');
  finish(a, "NOT RUN", "a property test over a random sequence of actions belongs in the suite, not in a live run");

  begin("12", "Money is conserved");
  detail('covered by the same property test in test/Invariants.ts, and the payout share is covered by "pays each saver a share of the prizes that tracks their share of the pool" in test/Fairness.ts');
  finish(a, "NOT RUN", "a property test over a random sequence of actions belongs in the suite, not in a live run");
}

task("hearth:audit", "Executes every attack in the threat model against a live deployment").setAction(
  async (_args, hre) => {
    const transcript: string[] = [];
    const printed = console.log;
    console.log = (...args: unknown[]): void => {
      transcript.push(args.map((value) => String(value)).join(" "));
      printed(...args);
    };

    const started = Date.now();
    let rows: RowResult[] = [];
    try {
      const ctx = await load(hre);
      const signers = await hre.ethers.getSigners();
      const a: Audit = {
        hre,
        ctx,
        signers,
        keeper: signers[KEEPER_ACCOUNT],
        local: hre.network.name !== "sepolia",
        rows: [],
      };
      rows = a.rows;

      console.log(`Hearth self-audit on ${hre.network.name}, ${new Date().toISOString()}`);
      console.log(`vault ${ctx.addresses.vault}, pool ${ctx.addresses.pool}, asset ${ctx.addresses.asset}`);
      console.log(
        `period ${await currentPeriod(a)}, ${await ctx.vault.saverCount()} savers, bracket 2^${await ctx.pool.scaleBits()}, ` +
          `tier liquidity ${usd(await liquidityTotal(a))} USDC`,
      );
      console.log(
        "Every row below is one line of the table \"What is checked, and how\" in docs/security/threat-model.md, in order.",
      );

      await rowStranger(a);
      await rowAggregate(a);
      await rowFlashDeposit(a);
      await rowFakeSavers(a);
      await rowAiming(a);
      await rowLateClose(a);
      await rowMissedAward(a);
      await rowBrokenYield(a);
      await rowOverSubscribed(a);
      await rowProofReplay(a);
      rowProperties(a);

      const passed = a.rows.filter((row) => row.verdict === "PASS").length;
      const failed = a.rows.filter((row) => row.verdict === "FAIL").length;
      const skipped = a.rows.filter((row) => row.verdict === "NOT RUN").length;
      console.log("");
      console.log(`${a.rows.length} rows in ${((Date.now() - started) / 1000).toFixed(1)}s: ${passed} PASS, ${failed} FAIL, ${skipped} NOT RUN`);
      for (const row of a.rows) console.log(`  ${row.verdict.padEnd(7)} row ${row.row.padEnd(3)} ${row.claim}`);
    } finally {
      console.log = printed;
      const directory = join(hre.config.paths.root, "..", "..", "docs", "security", "attacks");
      mkdirSync(directory, { recursive: true });
      const file = join(directory, `${hre.network.name}-${Math.floor(Date.now() / 1000)}.log`);
      writeFileSync(file, `${transcript.join("\n")}\n`, "utf8");
      console.log(`\nThe whole transcript above is saved at ${file}`);
    }

    const failed = rows.filter((row) => row.verdict === "FAIL");
    if (failed.length > 0) {
      throw new Error(`${failed.length} attack row(s) failed: ${failed.map((row) => row.row).join(", ")}`);
    }
  },
);
