import { FhevmType, type FhevmTypeEuint } from "@fhevm/hardhat-plugin";
import type { Contract, ContractTransactionReceipt, ContractTransactionResponse, Signer } from "ethers";
import { task, types } from "hardhat/config";
import type { HardhatRuntimeEnvironment, HttpNetworkConfig } from "hardhat/types";
import { networkConfig } from "../hearth.config";
import type { HearthPrizePool, HearthVault, SponsoredYieldSource } from "../types";

/**
 * Operator tasks for a deployed Hearth: spread gas, seed a demo pool, read the state, drive a whole
 * draw the way the keeper does, and prove the promise end to end.
 *
 * Everything here is what any saver could do from the app. No step needs an owner key.
 */

export const TIER_NAMES = ["grand", "mid", "frequent"] as const;
const STATUS_NAMES = ["not closed", "closed", "awarded", "empty", "skipped"] as const;
export const EVALUATE_BATCH = 4;

/**
 * Account roles, zero based, all derived from the one recovery phrase. Index 0 deploys and owns,
 * index 1 is the keeper and never a saver, so nothing the keeper signs carries a saver's
 * information, and indexes 2 to 6 are the demo savers. The prover is the last and smallest of
 * them, so a prove run reads a real saver's own numbers rather than a fresh address's.
 */
export const KEEPER_ACCOUNT = 1;
export const FIRST_SAVER_ACCOUNT = 2;
export const PROVER_ACCOUNT = 6;

const SEED_STAKES = [1_200, 600, 300, 150, 75].map((whole) => BigInt(whole) * 1_000_000n);
const PROVE_STAKE = 500_000_000n;

/** How far back the tasks look for draws worth acting on or reading. */
const RECENT_DRAWS = 4;

/** Only the calls the tasks make, so the same code drives our wrapper and Zama's. */
export const WRAPPER_ABI = [
  "function rate() view returns (uint256)",
  "function underlying() view returns (address)",
  "function wrap(address to, uint256 amount)",
  "function confidentialBalanceOf(address account) view returns (bytes32)",
  "function confidentialTransferAndCall(address to, bytes32 amount, bytes inputProof, bytes data) returns (bytes32)",
];

export const ERC20_ABI = [
  "function balanceOf(address account) view returns (uint256)",
  "function approve(address spender, uint256 amount) returns (bool)",
  "function mint(address to, uint256 amount)",
  "function claim()",
];

/**
 * Every shape a decrypted value arrives in. `euint8`, `euint16` and `euint32` come back as
 * JavaScript numbers and everything wider as a bigint, so the draw's scale count is a number while
 * its seed and harvest are bigints. The legacy relayer SDK returned bigints throughout, which is
 * why this only matters from `@zama-fhe/sdk` onward.
 */
export type Cleartext = bigint | boolean | number | string;
export type Published = { readonly values: readonly Cleartext[]; readonly proof: string };

type Hex = `0x${string}`;
type ClearMap = Readonly<Record<string, unknown>>;
type ZamaModule = typeof import("@zama-fhe/sdk");
type ZamaSdk = import("@zama-fhe/sdk").ZamaSDK;

export type Hearth = {
  readonly hre: HardhatRuntimeEnvironment;
  readonly vault: HearthVault;
  readonly pool: HearthPrizePool;
  readonly source: SponsoredYieldSource;
  readonly asset: Contract;
  readonly underlying: Contract;
  readonly addresses: {
    readonly vault: string;
    readonly pool: string;
    readonly source: string;
    readonly asset: string;
    readonly underlying: string;
  };
  readonly periodLength: bigint;
};

class ProveFailed extends Error {}

export function group(value: bigint | number): string {
  return value.toLocaleString("en-US");
}

export function usd(units: bigint): string {
  const negative = units < 0n;
  const absolute = negative ? -units : units;
  const whole = (absolute / 1_000_000n).toLocaleString("en-US");
  const fraction = (absolute % 1_000_000n).toString().padStart(6, "0").slice(0, 2);
  return `${negative ? "-" : ""}${whole}.${fraction}`;
}

export function duration(seconds: bigint): string {
  if (seconds <= 0n) return "0s";
  const minutes = seconds / 60n;
  const rest = seconds % 60n;
  return minutes === 0n ? `${rest}s` : `${minutes}m ${rest}s`;
}

export function statusName(status: bigint | number): string {
  return STATUS_NAMES[Number(status)] ?? `unknown (${status})`;
}

export function at(timestamp: bigint): string {
  return new Date(Number(timestamp) * 1000).toISOString();
}

export function asBigint(value: Cleartext | undefined, what: string): bigint {
  if (typeof value === "bigint") return value;
  if (typeof value === "number") return BigInt(value);
  if (typeof value === "boolean") return value ? 1n : 0n;
  if (typeof value === "string") return BigInt(value);
  throw new Error(`${what} came back as ${typeof value}, and a number was expected`);
}

export function asBoolean(value: Cleartext | undefined, what: string): boolean {
  if (typeof value === "boolean") return value;
  return asBigint(value, what) !== 0n;
}

/** The relayer answers with a map keyed by handle and says nothing about key case. */
function order(handles: readonly string[], clearValues: ClearMap): readonly Cleartext[] {
  const byHandle = new Map<string, unknown>();
  for (const [key, value] of Object.entries(clearValues)) byHandle.set(key.toLowerCase(), value);
  return handles.map((handle) => {
    const value = byHandle.get(handle.toLowerCase());
    if (value === undefined) throw new Error(`the relayer returned no cleartext for handle ${handle}`);
    const kind = typeof value;
    if (kind !== "bigint" && kind !== "number" && kind !== "boolean" && kind !== "string") {
      throw new Error(`the cleartext of ${handle} came back as ${kind}, which is not a number, a flag or an address`);
    }
    return value as Cleartext;
  });
}

function asHex(value: string, what: string): Hex {
  if (!/^0x[0-9a-fA-F]*$/.test(value)) throw new Error(`${what} is not hex: ${value}`);
  return value as Hex;
}

/**
 * Loaded the first time a Sepolia task decrypts rather than when Hardhat loads this file. The SDK
 * drags in the FHE runtime and its multi-megabyte keys, and every compile, deploy and local run
 * would otherwise pay for a module they never call.
 */
let sdkModule: Promise<ZamaModule> | null = null;

function zama(): Promise<ZamaModule> {
  sdkModule ??= import("@zama-fhe/sdk");
  return sdkModule;
}

/**
 * One SDK per account. The transport key pair and the EIP-712 permit the relayer checks are bound
 * to the address that signed them, and a single run decrypts as five savers, the prover and a
 * fresh stranger, so a shared instance would throw the previous account's credentials away on
 * every switch.
 */
const sdkBySigner = new Map<string, Promise<ZamaSdk>>();
let readOnlySdk: Promise<ZamaSdk> | null = null;

function rpcUrl(hre: HardhatRuntimeEnvironment): string {
  return (hre.network.config as HttpNetworkConfig).url;
}

async function signerSdk(hre: HardhatRuntimeEnvironment, who: Signer): Promise<ZamaSdk> {
  const key = (await who.getAddress()).toLowerCase();
  const known = sdkBySigner.get(key);
  if (known !== undefined) return known;

  const building = (async (): Promise<ZamaSdk> => {
    const [{ ZamaSDK, memoryStorage }, { createConfig }, { node }, { sepolia }] = await Promise.all([
      zama(),
      import("@zama-fhe/sdk/ethers"),
      import("@zama-fhe/sdk/node"),
      import("@zama-fhe/sdk/chains"),
    ]);
    return new ZamaSDK(
      createConfig({
        chains: [{ ...sepolia, network: rpcUrl(hre) }],
        signer: who,
        storage: memoryStorage,
        relayers: { [sepolia.id]: node() },
      }),
    );
  })();
  sdkBySigner.set(key, building);
  return building;
}

/**
 * A public decryption is signer-independent, so this instance is configured with a provider and no
 * wallet at all and cannot user-decrypt anyone's handle by mistake. The ethers adapter's
 * createConfig has no provider-only variant, so the provider is wrapped by hand and handed to the
 * generic one.
 */
function publicSdk(hre: HardhatRuntimeEnvironment): Promise<ZamaSdk> {
  readOnlySdk ??= (async (): Promise<ZamaSdk> => {
    const [{ ZamaSDK, createConfig, memoryStorage }, { EthersProvider }, { node }, { sepolia }] = await Promise.all([
      zama(),
      import("@zama-fhe/sdk/ethers"),
      import("@zama-fhe/sdk/node"),
      import("@zama-fhe/sdk/chains"),
    ]);
    return new ZamaSDK(
      createConfig({
        chains: [{ ...sepolia, network: rpcUrl(hre) }],
        provider: new EthersProvider({ provider: hre.ethers.provider }),
        storage: memoryStorage,
        relayers: { [sepolia.id]: node() },
      }),
    );
  })();
  return readOnlySdk;
}

/**
 * Failures that mean "ask again in a moment" rather than "never". @zama-fhe/sdk folds everything
 * outside its own transient set into a terminal DecryptionFailedError and keeps the original on
 * `cause`, so the reason has to be read off the chain.
 *
 * Matched on message text rather than on the error class, because `@fhevm/sdk`'s error base
 * overwrites `name` with "FhevmErrorBase" on every error it throws: the class that was raised is
 * simply not on the object. Verified against the live relayer on 2 September 2026, where an ACL
 * refusal arrived as `DecryptionFailedError` wrapping a cause named "FhevmErrorBase".
 *
 * The access control entry is here because the SDK checks the list against its own RPC before it
 * calls the relayer, and every handle asked for publicly was made decryptable by a mined
 * transaction, so that answer means the node is a block or two behind rather than that the handle
 * is private. A user decryption refused by the list is a NotEntitledError instead, which reads
 * "is not authorized to decrypt handle" and is deliberately not on this list.
 */
const ASK_AGAIN_MESSAGES = [
  "not allowed for public decryption",
  "request timed out",
  "maximum polling retry limit exceeded",
  "relayer sdk internal error",
  "fetch failed",
  "socket hang up",
  "econnreset",
  "etimedout",
  "eai_again",
];

/**
 * Sepolia's KMS is thirteen parties and a user decryption reconstructs from nine of their shares,
 * each signcrypted to the caller's transport key. One party currently serves a share the others
 * disagree with, and reconstruction fails with "Gao decoding failure ... n=13, deg=4, #shares=9".
 *
 * Measured on 2 September 2026: the same handle failed six times out of six when asked again under
 * the same transport key pair, and succeeded on the third try when the key pair was regenerated
 * between tries. The bad share is fixed to the key pair, so waiting changes nothing and a fresh
 * key pair is the only thing that redraws it. Zama's party set is Zama's to fix; asking again
 * under a new key is ours.
 */
const BAD_SHARE_MESSAGES = ["error reconstructing all blocks", "gao decoding failure"];

/** What a failed decryption is worth doing about. */
type Recovery = "give up" | "ask again" | "new credentials";

/**
 * How many times each recovery is worth trying. A wait for the coprocessor to catch up is long and
 * a redrawn share is not, so they do not share a budget. Twenty redraws because the bad share is
 * drawn far more often than not: on 2 September 2026 one handle took seven redraws, and a prove
 * run makes ten decryptions in a row, so a budget that clears one handle most of the time still
 * loses whole runs.
 */
const ASK_AGAIN_LIMIT = 6;
const NEW_CREDENTIALS_LIMIT = 20;

/** viem, ethers and the FHE backend each nest a lower level failure under a different key. */
function causeChain(error: unknown): Record<string, unknown>[] {
  const nodes: Record<string, unknown>[] = [];
  let current: unknown = error;
  for (let depth = 0; depth < 6 && current !== null && current !== undefined; depth++) {
    if (typeof current !== "object") break;
    const node = current as Record<string, unknown>;
    nodes.push(node);
    current = node["cause"] ?? node["error"] ?? node["info"];
  }
  return nodes;
}

function saysAny(nodes: readonly Record<string, unknown>[], needles: readonly string[]): boolean {
  return nodes.some((node) => {
    const message = node["message"];
    const details = node["details"];
    const text = `${typeof message === "string" ? message : ""} ${typeof details === "string" ? details : ""}`;
    const lowered = text.toLowerCase();
    return needles.some((needle) => lowered.includes(needle));
  });
}

async function classify(error: unknown): Promise<Recovery> {
  const nodes = causeChain(error);
  if (saysAny(nodes, BAD_SHARE_MESSAGES)) return "new credentials";

  const { isRetryable } = await zama();
  if (isRetryable(error)) return "ask again";
  if (saysAny(nodes, ASK_AGAIN_MESSAGES)) return "ask again";

  // The relayer's own status getter, for a server fault whose wording this file has not seen.
  const serverFault = nodes.some((node) => {
    const status = node["statusCode"] ?? node["status"];
    return typeof status === "number" && status >= 500;
  });
  return serverFault ? "ask again" : "give up";
}

/** The first line of whatever the failure carries, which is the part a terminal can read. */
export function firstLine(error: unknown): string {
  return error instanceof Error ? error.message.split("\n")[0].trim() : String(error);
}

/**
 * The SDK spreads the three facts of an access-control refusal over a four-sentence paragraph, and
 * prove step 3 and the audit transcript print a refusal straight to the terminal. Any other
 * failure is not the list refusing, so it is left alone.
 */
export function decryptRefusal(error: unknown): string | null {
  const shaped = error as { code?: unknown; account?: unknown; contractAddress?: unknown; encryptedValue?: unknown };
  if (shaped.code !== "NOT_ENTITLED") return null;
  return (
    `NotEntitledError: the access control list does not allow ${String(shaped.account)} to decrypt ` +
    `${String(shaped.encryptedValue)} on ${String(shaped.contractAddress)}`
  );
}

/**
 * A handle published seconds ago is not decryptable until the coprocessor and the RPC node have
 * caught up with the block that published it, so a first refusal is normal rather than a failure.
 * Only the failures the SDK marks retryable and the two families above are acted on; a refusal on
 * the access control list comes straight back, which is what keeps a stranger's refusal one
 * attempt long.
 *
 * `reseed` throws the caller's transport key pair and permits away, which is the only thing that
 * moves a bad KMS share. A public decryption has no transport key pair to throw away, so it
 * passes nothing and falls back to plain waiting for that class.
 */
async function withBackoff<T>(run: () => Promise<T>, reseed?: () => Promise<void>): Promise<T> {
  let wait = 4_000;
  let asked = 0;
  let reseeded = 0;
  for (;;) {
    try {
      return await run();
    } catch (error) {
      const recovery = await classify(error);
      if (recovery === "give up") throw error;

      if (recovery === "new credentials" && reseed !== undefined) {
        reseeded += 1;
        if (reseeded > NEW_CREDENTIALS_LIMIT) throw error;
        await reseed();
        console.log(`  a KMS share did not reconstruct, asking again under a fresh transport key (try ${reseeded})`);
        continue;
      }

      asked += 1;
      if (asked > ASK_AGAIN_LIMIT) throw error;
      console.log(`  the relayer is not ready yet, asking again in ${wait / 1_000}s (try ${asked}): ${firstLine(error)}`);
      await new Promise((done) => setTimeout(done, wait));
      wait = Math.min(wait * 2, 30_000);
    }
  }
}

/**
 * One public decryption with its KMS proof. The clear values come back in the order the handles
 * were asked in, and that order is the contract rather than a convenience: the pool ABI-encodes
 * the values itself in the same order and checks the KMS signature over that encoding, so asking
 * in any other order makes checkSignatures revert.
 */
export async function publicDecrypt(hre: HardhatRuntimeEnvironment, handles: readonly string[]): Promise<Published> {
  const asked = [...handles];
  if (hre.network.name !== "sepolia") {
    const results = (await hre.fhevm.publicDecrypt(asked)) as unknown as {
      clearValues: ClearMap;
      decryptionProof: string;
    };
    return { values: order(asked, results.clearValues), proof: results.decryptionProof };
  }

  const sdk = await publicSdk(hre);
  const wanted = asked.map((handle, index) => asHex(handle, `handle ${index + 1}`));
  return withBackoff(async () => {
    const published = await sdk.decryption.decryptPublicValues(wanted);
    return { values: order(asked, published.clearValues), proof: published.decryptionProof };
  });
}

/** An address that has never held the value has no handle at all, which reads as a plaintext zero. */
export async function userDecrypt(
  hre: HardhatRuntimeEnvironment,
  handle: string,
  contract: string,
  who: Signer,
  type: FhevmTypeEuint = FhevmType.euint64,
): Promise<bigint> {
  if (handle === hre.ethers.ZeroHash) return 0n;
  if (hre.network.name !== "sepolia") {
    return hre.fhevm.userDecryptEuint(type, handle, contract, who);
  }

  const sdk = await signerSdk(hre, who);
  const wanted = asHex(handle, "the handle");
  const contractAddress = asHex(contract, "the contract address");
  const values = await withBackoff(
    () => sdk.decryption.decryptValues([{ encryptedValue: wanted, contractAddress }]),
    () => sdk.permits.clear(),
  );
  return asBigint(order([handle], values)[0], `the cleartext of ${handle}`);
}

/** True once every saver in the draw's walk has been evaluated. A walk of zero has not started. */
export async function walkComplete(vault: HearthVault, drawId: number): Promise<boolean> {
  const walk = await vault.walkOf(drawId);
  return walk.count > 0n && (await vault.cursorOf(drawId)) >= walk.count;
}

export async function chainNow(hre: HardhatRuntimeEnvironment): Promise<bigint> {
  const block = await hre.ethers.provider.getBlock("latest");
  if (block === null) throw new Error("the node returned no latest block");
  return BigInt(block.timestamp);
}

export async function mine(call: Promise<ContractTransactionResponse>): Promise<ContractTransactionReceipt> {
  const tx = await call;
  const receipt = await tx.wait();
  if (receipt === null) throw new Error(`transaction ${tx.hash} did not confirm`);
  return receipt;
}

export async function send(what: string, call: Promise<ContractTransactionResponse>): Promise<ContractTransactionReceipt> {
  const receipt = await mine(call);
  console.log(`${what} (tx ${receipt.hash}, gas ${group(receipt.gasUsed)})`);
  return receipt;
}

export async function load(hre: HardhatRuntimeEnvironment): Promise<Hearth> {
  if (hre.network.name === "hardhat") {
    throw new Error(
      "The in-process hardhat network has no FHEVM coprocessor outside `hardhat test`, and its chain " +
        "ends with the process. Start `hardhat node` in another terminal and add --network localhost.",
    );
  }
  await hre.fhevm.initializeCLIApi();

  const named = async (name: string): Promise<string> => {
    // hardhat-deploy answers with undefined rather than null for a name it has never saved.
    const deployment = await hre.deployments.getOrNull(name);
    if (!deployment) {
      throw new Error(`${name} is not deployed on ${hre.network.name}. Run: hardhat deploy --network ${hre.network.name}`);
    }
    return deployment.address;
  };

  const addresses = {
    vault: await named("HearthVault"),
    pool: await named("HearthPrizePool"),
    source: await named("SponsoredYieldSource"),
    asset: "",
    underlying: "",
  };

  const vault = (await hre.ethers.getContractAt("HearthVault", addresses.vault)) as unknown as HearthVault;
  const pool = (await hre.ethers.getContractAt("HearthPrizePool", addresses.pool)) as unknown as HearthPrizePool;
  const source = (await hre.ethers.getContractAt(
    "SponsoredYieldSource",
    addresses.source,
  )) as unknown as SponsoredYieldSource;

  const assetAddress = await vault.asset();
  const asset = new hre.ethers.Contract(assetAddress, WRAPPER_ABI, hre.ethers.provider);
  const underlyingAddress = (await asset.underlying()) as string;

  return {
    hre,
    vault,
    pool,
    source,
    asset,
    underlying: new hre.ethers.Contract(underlyingAddress, ERC20_ABI, hre.ethers.provider),
    addresses: { ...addresses, asset: assetAddress, underlying: underlyingAddress },
    periodLength: await vault.periodLength(),
  };
}

/**
 * Gets `amount` of the public token to `who`. Zama's mock USDC mints to anyone; the local TestUSDC
 * has a faucet on a cooldown instead, which is why a short balance can still fail here.
 */
export async function obtain(ctx: Hearth, who: Signer, amount: bigint): Promise<void> {
  const address = await who.getAddress();
  const held = (await ctx.underlying.balanceOf(address)) as bigint;
  if (held >= amount) {
    console.log(`  ${address} already holds ${usd(held)} USDC, so nothing is minted`);
    return;
  }

  const code = await ctx.hre.ethers.provider.getCode(ctx.addresses.underlying);
  const has = (signature: string): boolean =>
    code.includes(ctx.hre.ethers.id(signature).slice(2, 10).toLowerCase());
  const token = ctx.underlying.connect(who) as Contract;

  if (has("mint(address,uint256)")) {
    await send(`  minted ${usd(amount - held)} USDC to ${address}`, token.mint(address, amount - held));
  } else if (has("claim()")) {
    await send(`  claimed the faucet for ${address}`, token.claim());
  } else {
    throw new Error(`${ctx.addresses.underlying} has neither a public mint nor a faucet, so ${address} cannot be funded`);
  }

  const now = (await ctx.underlying.balanceOf(address)) as bigint;
  if (now < amount) {
    throw new Error(
      `${address} holds ${usd(now)} USDC but needs ${usd(amount)}. The faucet pays a fixed amount on a cooldown, ` +
        "so wait for it or use a different account.",
    );
  }
}

export async function wrapAndDeposit(ctx: Hearth, who: Signer, amount: bigint): Promise<void> {
  const address = await who.getAddress();
  await send(
    `  approved the wrapper to take ${usd(amount)} USDC from ${address}`,
    (ctx.underlying.connect(who) as Contract).approve(ctx.addresses.asset, amount),
  );
  await send(
    `  wrapped ${usd(amount)} USDC into confidential USDC for ${address}`,
    (ctx.asset.connect(who) as Contract).wrap(address, amount),
  );

  const input = await ctx.hre.fhevm.createEncryptedInput(ctx.addresses.asset, address).add64(amount).encrypt();
  await send(
    `  deposited an encrypted amount into the vault for ${address}`,
    (ctx.asset.connect(who) as Contract)["confidentialTransferAndCall(address,bytes32,bytes,bytes)"](
      ctx.addresses.vault,
      input.handles[0],
      input.inputProof,
      "0x",
    ),
  );
}

export async function warp(hre: HardhatRuntimeEnvironment, seconds: bigint): Promise<void> {
  await hre.network.provider.send("evm_increaseTime", [Number(seconds)]);
  await hre.network.provider.send("evm_mine", []);
}

export type DrawOutcome = { readonly closed: number | null; readonly awarded: number | null };

/**
 * Every step a keeper pass performs, in the order the keeper performs them.
 *
 * The finalizes come first and the reconciles read the carries they just published, because
 * `HearthVault.openDraw` leaves a tier's carry out of the draw entirely while it is pending. Close
 * before the reconcile and that money is neither offered nor winnable until the following draw.
 */
export async function driveDraw(ctx: Hearth, keeper: Signer): Promise<DrawOutcome> {
  const period = Number(await ctx.pool.currentPeriod());

  await finalizeWindows(ctx, keeper, period);
  await reconcileCarries(ctx, keeper);

  let closed: number | null = null;
  const closable = Number(await ctx.pool.closableDraw());
  if (closable === 0) {
    console.log(`nothing is closable in period ${period}, so this pass awards and evaluates what is already open`);
  } else {
    const deadline = await ctx.pool.closeDeadline(closable);
    console.log(`closing draw ${closable}, which has until ${at(deadline)}`);
    await send(`closed draw ${closable}`, ctx.pool.connect(keeper)["closeDraw(uint32)"](closable));
    closed = closable;
  }

  const awarded = await awardClosedDraws(ctx, keeper, period);
  for (const drawId of awarded) await evaluateFully(ctx, keeper, drawId);

  return { closed, awarded: awarded.length > 0 ? awarded[awarded.length - 1] : null };
}

export async function awardClosedDraws(ctx: Hearth, keeper: Signer, period: number): Promise<number[]> {
  const awarded: number[] = [];
  for (let drawId = Math.max(1, period - 3); drawId <= period; drawId++) {
    const draw = await ctx.pool.drawOf(drawId);
    if (Number(draw.status) !== 1) continue;

    console.log(`draw ${drawId}: asking for the seed, the scale, the empty flag and the harvest, in that order`);
    const published = await publicDecrypt(ctx.hre, [
      draw.seedHandle,
      draw.scaleHandle,
      draw.nonEmptyHandle,
      draw.harvestHandle,
    ]);
    const seed = asBigint(published.values[0], "the draw seed");
    const scaleCount = asBigint(published.values[1], "the scale count");
    const nonEmpty = asBoolean(published.values[2], "the non-empty flag");
    const harvested = asBigint(published.values[3], "the harvest");
    console.log(
      `  the KMS signed: seed ${seed}, scale count ${scaleCount}, someone held a balance: ${nonEmpty}, ` +
        `harvest ${usd(harvested)} USDC`,
    );

    await send(
      `awarded draw ${drawId}`,
      ctx.pool.connect(keeper).awardDraw(drawId, seed, scaleCount, nonEmpty, harvested, published.proof),
    );

    const after = Number((await ctx.pool.drawOf(drawId)).status);
    if (after === 2) {
      awarded.push(drawId);
      console.log(`  draw ${drawId} runs against a range of 2^${(await ctx.pool.drawParams(drawId)).scaleBits}`);
    } else {
      console.log(`  draw ${drawId} is ${statusName(after)}, so its liquidity went straight back to the tiers`);
    }
  }
  return awarded;
}

export async function evaluateFully(ctx: Hearth, keeper: Signer, drawId: number): Promise<void> {
  if ((await ctx.vault.saverCount()) === 0n) {
    console.log(`draw ${drawId} has no savers to evaluate`);
    return;
  }

  for (let pass = 0; pass < 64; pass++) {
    if (await walkComplete(ctx.vault, drawId)) break;
    const cursor = await ctx.vault.cursorOf(drawId);

    const receipt = await send(
      `evaluated draw ${drawId} in a batch of ${EVALUATE_BATCH}`,
      ctx.vault.connect(keeper).evaluate(drawId, EVALUATE_BATCH),
    );
    const moved = await ctx.vault.cursorOf(drawId);
    console.log(
      `  ${moved} of ${(await ctx.vault.walkOf(drawId)).count} savers done (gas ${group(receipt.gasUsed)})`,
    );
    if (moved === cursor) break;
  }
}

/**
 * The newest awarded draw `address` holds a weight in, which is the newest one it can check its own
 * outcome against. A draw whose walk has not finished is skipped, because it may not have reached
 * this saver yet, and a saver with no weight handle was not in that draw's walk at all.
 */
async function newestOwnDraw(ctx: Hearth, address: string, period: number): Promise<number | null> {
  // The first draw after a deployment offers nothing, because liquidity only exists once an award
  // has booked a harvest, and a zero-prize draw proves little. A funded draw is preferred and an
  // unfunded one is only the fallback.
  let unfunded: number | null = null;
  for (let drawId = period; drawId >= Math.max(1, period - RECENT_DRAWS); drawId--) {
    const draw = await ctx.pool.drawOf(drawId);
    if (Number(draw.status) !== 2) continue;
    if (!(await walkComplete(ctx.vault, drawId))) continue;
    if ((await ctx.vault.weightHandle(drawId, address)) === ctx.hre.ethers.ZeroHash) continue;
    if (draw.offered.some((value) => value > 0n)) return drawId;
    if (unfunded === null) unfunded = drawId;
  }
  return unfunded;
}

async function finalizeWindows(ctx: Hearth, keeper: Signer, period: number): Promise<void> {
  for (let drawId = Math.max(1, period - RECENT_DRAWS); drawId <= period; drawId++) {
    const draw = await ctx.pool.drawOf(drawId);
    if (Number(draw.status) !== 2) continue;
    if (await ctx.vault.finalized(drawId)) continue;
    if (BigInt(period) <= BigInt(drawId) + 2n) continue;
    await send(`finalized draw ${drawId}`, ctx.vault.connect(keeper).finalizeDraw(drawId));
  }
}

/** Reads the carries after the finalizes have landed, so a carry published moments ago is booked
 * back into plaintext liquidity before the next close sizes its prizes. */
async function reconcileCarries(ctx: Hearth, keeper: Signer): Promise<void> {
  for (let tier = 0; tier < TIER_NAMES.length; tier++) {
    const [handle, publishedAt, pending] = await ctx.vault.publishedCarry(tier);
    if (!pending) continue;
    console.log(`the ${TIER_NAMES[tier]} tier published its carry at draw ${publishedAt}, asking for the cleartext`);
    const published = await publicDecrypt(ctx.hre, [handle]);
    const carry = asBigint(published.values[0], `the ${TIER_NAMES[tier]} carry`);
    await send(
      `reconciled the ${TIER_NAMES[tier]} tier, putting ${usd(carry)} USDC back on offer`,
      ctx.pool.connect(keeper).reconcile(tier, carry, published.proof),
    );
  }
}

task("hearth:spread-gas", "Sends ETH from the deployer to the keeper and the demo savers")
  .addOptionalParam("amount", "ETH each saver receives", "0.15", types.string)
  .addOptionalParam("keeper", "ETH the keeper receives", "1.5", types.string)
  .addOptionalParam("count", "Index of the last saver account", 6, types.int)
  .setAction(async (args: { amount: string; keeper: string; count: number }, hre) => {
    const signers = await hre.ethers.getSigners();
    if (signers.length <= args.count) {
      throw new Error(
        `This network derives ${signers.length} account(s), so index ${args.count} does not exist. ` +
          "Set RECOVERY_PHRASE in packages/contracts/.env, which derives ten.",
      );
    }

    const from = signers[0];
    console.log(
      `${await from.getAddress()} holds ${hre.ethers.formatEther(await hre.ethers.provider.getBalance(from))} ETH`,
    );

    const pay = async (index: number, ether: string, role: string): Promise<void> => {
      const to = await signers[index].getAddress();
      const tx = await from.sendTransaction({ to, value: hre.ethers.parseEther(ether) });
      const receipt = await tx.wait();
      const held = await hre.ethers.provider.getBalance(to);
      console.log(
        `sent ${ether} ETH to the ${role} at index ${index}, ${to}, which now holds ` +
          `${hre.ethers.formatEther(held)} ETH (tx ${tx.hash}, gas ${group(receipt?.gasUsed ?? 0n)})`,
      );
    };

    // The keeper gets its own larger share because it pays for every close, award, evaluation
    // batch, finalization and reconciliation, draw after draw, while a saver pays only for its
    // own deposit and withdrawal.
    await pay(KEEPER_ACCOUNT, args.keeper, "keeper");
    for (let index = FIRST_SAVER_ACCOUNT; index <= args.count; index++) {
      await pay(index, args.amount, "saver");
    }
  });

task("hearth:warp", "Moves the local chain's clock forward. Local networks only")
  .addParam("seconds", "How many seconds to skip", undefined, types.int)
  .setAction(async (args: { seconds: number }, hre) => {
    if (hre.network.name === "sepolia") {
      throw new Error("Sepolia's clock cannot be moved. Wait for the period to end, or shorten periodLength.");
    }
    await warp(hre, BigInt(args.seconds));
    const now = await chainNow(hre);
    console.log(`the chain now says ${at(now)}`);

    const vault = await hre.deployments.getOrNull("HearthVault");
    if (vault) {
      const contract = (await hre.ethers.getContractAt("HearthVault", vault.address)) as unknown as HearthVault;
      console.log(`that is period ${await contract.currentPeriod()}`);
    }
  });

task("hearth:verify", "Publishes every deployed contract's source with the arguments the deploy recorded").setAction(
  async (_args, hre) => {
    // hardhat-deploy's own etherscan-verify still posts to the per-network v1 endpoints, which
    // Etherscan retired. hardhat-verify 2.1.3 posts to the v2 endpoint with a chain id, which is
    // what a single ETHERSCAN_API_KEY works against.
    for (const name of ["TestUSDC", "ConfidentialUSDC", "HearthVault", "HearthPrizePool", "SponsoredYieldSource"]) {
      const deployment = await hre.deployments.getOrNull(name);
      if (!deployment) continue;
      try {
        await hre.run("verify:verify", { address: deployment.address, constructorArguments: deployment.args ?? [] });
        console.log(`${name} at ${deployment.address} is verified`);
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        if (message.toLowerCase().includes("already verified")) {
          console.log(`${name} at ${deployment.address} was already verified`);
        } else {
          console.error(`${name} at ${deployment.address} could not be verified: ${message}`);
        }
      }
    }
  },
);

task("hearth:seed", "Sponsors the yield source and fills the pool with five savers of different sizes").setAction(
  async (_args, hre) => {
    const ctx = await load(hre);
    const config = networkConfig(hre.network.name);
    const signers = await hre.ethers.getSigners();
    const deployer = signers[0];

    console.log(`Seeding Hearth on ${hre.network.name}.`);
    // A seed that stops half way, for example on a relayer hiccup, must be safe to run again, so
    // every step checks the chain for what is already done before spending anything.
    if ((await ctx.source.balance()) >= config.initialSponsorship) {
      console.log(`the yield source already holds its sponsorship, so nothing more is sponsored`);
    } else {
      console.log(`sponsoring the yield source with ${usd(config.initialSponsorship)} USDC`);
      await obtain(ctx, deployer, config.initialSponsorship);
      await send(
        `  approved the source to take ${usd(config.initialSponsorship)} USDC`,
        (ctx.underlying.connect(deployer) as Contract).approve(ctx.addresses.source, config.initialSponsorship),
      );
      await send(
        `  sponsored ${usd(config.initialSponsorship)} USDC`,
        ctx.source.connect(deployer).sponsor(config.initialSponsorship),
      );
    }
    console.log(
      `the source now holds ${usd(await ctx.source.balance())} USDC and releases ` +
        `${usd((await ctx.source.ratePerSecond()) * ctx.periodLength)} USDC a period`,
    );

    for (let index = 0; index < SEED_STAKES.length; index++) {
      const saver = signers[FIRST_SAVER_ACCOUNT + index];
      const stake = SEED_STAKES[index];
      const address = await saver.getAddress();
      if (await ctx.vault.isSaver(address)) {
        console.log(`saver at account index ${FIRST_SAVER_ACCOUNT + index}, ${address}, is already in the pool`);
      } else {
        console.log(`saver at account index ${FIRST_SAVER_ACCOUNT + index}, ${address}, is depositing ${usd(stake)} USDC`);
        await obtain(ctx, saver, stake);
        await wrapAndDeposit(ctx, saver, stake);
      }

      // Read back on every run, not just after a deposit, so a resumed seed still proves that the
      // saver and nobody else can read what they hold.
      try {
        const principal = await userDecrypt(
          hre,
          await ctx.vault.confidentialBalanceOf(address),
          ctx.addresses.vault,
          saver,
        );
        console.log(`  they decrypted their own principal and it reads ${usd(principal)} USDC`);
      } catch (error) {
        // The deposit is on chain either way; a failed self-decryption is the relayer's problem and
        // is reported rather than allowed to strand the remaining savers.
        const message = decryptRefusal(error) ?? firstLine(error);
        console.log(`  their own decryption failed, which does not affect the deposit: ${message}`);
      }
    }

    console.log(`the vault now has ${await ctx.vault.saverCount()} savers and period ${await ctx.vault.currentPeriod()} is running`);
  },
);

task("hearth:status", "Prints everything an operator needs to see about a live pool").setAction(async (_args, hre) => {
  const ctx = await load(hre);
  const signers = await hre.ethers.getSigners();
  const now = await chainNow(hre);

  const period = await ctx.vault.currentPeriod();
  const ends = await ctx.vault.periodEnd(period);
  console.log(`Hearth on ${hre.network.name}, vault ${ctx.addresses.vault}, pool ${ctx.addresses.pool}`);
  console.log(`period ${period} ends in ${duration(ends - now)} at ${at(ends)}`);

  const closable = Number(await ctx.pool.closableDraw());
  if (closable === 0) {
    console.log("no draw can be closed right now");
  } else {
    const deadline = await ctx.pool.closeDeadline(closable);
    console.log(`draw ${closable} can be closed for another ${duration(deadline - now)}`);
  }

  const newest = Number(period) - 1;
  for (let drawId = Math.max(1, newest - 2); drawId <= newest; drawId++) {
    const draw = await ctx.pool.drawOf(drawId);
    const prize = draw.prize.map((value) => usd(value)).join(" / ");
    const offered = draw.offered.reduce((total, value) => total + value, 0n);
    const evaluated = await ctx.vault.evaluatedCount(drawId);
    const walk = await ctx.vault.walkOf(drawId);
    console.log(
      `draw ${drawId}: ${statusName(draw.status)}, prizes ${prize} USDC, ${usd(offered)} USDC offered, ` +
        `${evaluated} of ${walk.count === 0n ? await ctx.vault.saverCount() : walk.count} savers evaluated`,
    );
  }

  for (let tier = 0; tier < TIER_NAMES.length; tier++) {
    const liquidity = await ctx.pool.liquidity(tier);
    const [, publishedAt, pending] = await ctx.vault.publishedCarry(tier);
    const carry = pending ? `a carry published at draw ${publishedAt} is waiting to be reconciled` : "no carry pending";
    console.log(`the ${TIER_NAMES[tier]} tier holds ${usd(liquidity)} USDC of plaintext liquidity, ${carry}`);
  }

  console.log(`draws run against a range of 2^${await ctx.pool.scaleBits()}, and the vault has ${await ctx.vault.saverCount()} savers`);

  const balance = await ctx.source.balance();
  const rate = await ctx.source.ratePerSecond();
  const perDraw = rate * ctx.periodLength;
  const runway = perDraw === 0n ? "for ever, because the rate is zero" : `${balance / perDraw} more draws`;
  console.log(
    `the sponsor holds ${usd(balance)} USDC and releases ${usd(perDraw)} USDC a draw, which lasts ${runway}`,
  );
  console.log(`${usd(await ctx.source.harvestable())} USDC is ready for the next harvest`);

  const keeper = await signers[KEEPER_ACCOUNT].getAddress();
  console.log(
    `the keeper, account index ${KEEPER_ACCOUNT} at ${keeper}, holds ` +
      `${hre.ethers.formatEther(await hre.ethers.provider.getBalance(keeper))} ETH`,
  );
  console.log(`the vault is ${(await ctx.vault.paused()) ? "paused" : "running"}, the pool is ${(await ctx.pool.paused()) ? "paused" : "running"}`);
});

task("hearth:draw", "Drives one whole draw from the keeper account, exactly as the keeper would").setAction(
  async (_args, hre) => {
    const ctx = await load(hre);
    const keeper = (await hre.ethers.getSigners())[KEEPER_ACCOUNT];
    console.log(`driving a draw from the keeper account ${await keeper.getAddress()}`);
    const outcome = await driveDraw(ctx, keeper);
    if (outcome.closed === null && outcome.awarded === null) {
      console.log("nothing was left to do on this pass");
    }
  },
);

task("hearth:prove", "Proves the whole promise end to end from one saver's account")
  .addOptionalParam("wait", "On Sepolia, wait for the deposit's period to end instead of stopping", false, types.boolean)
  .setAction(async (args: { wait: boolean }, hre) => {
    const ctx = await load(hre);
    const signers = await hre.ethers.getSigners();
    const saver = signers[PROVER_ACCOUNT];
    const keeper = signers[KEEPER_ACCOUNT];
    const address = await saver.getAddress();
    const started = Date.now();
    let step = 0;

    const say = (text: string, gas?: bigint): void => {
      step += 1;
      const elapsed = ((Date.now() - started) / 1000).toFixed(1);
      const cost = gas === undefined ? "" : `, gas ${group(gas)}`;
      console.log(`${step}. ${text} (${elapsed}s${cost})`);
    };

    console.log(`Proving Hearth on ${hre.network.name} from ${address}. Every line below is a real transaction or a real decryption.`);

    const before = await userDecrypt(hre, await ctx.vault.confidentialBalanceOf(address), ctx.addresses.vault, saver);
    const walletBefore = await userDecrypt(hre, await ctx.asset.confidentialBalanceOf(address), ctx.addresses.asset, saver);

    await obtain(ctx, saver, PROVE_STAKE);
    await wrapAndDeposit(ctx, saver, PROVE_STAKE);
    const depositPeriod = Number(await ctx.vault.currentPeriod());
    say(
      `I took ${usd(PROVE_STAKE)} of test USDC, wrapped it into confidential USDC and deposited it in period ${depositPeriod}`,
    );

    const principal = await userDecrypt(hre, await ctx.vault.confidentialBalanceOf(address), ctx.addresses.vault, saver);
    if (principal - before !== PROVE_STAKE) {
      throw new ProveFailed(`my principal moved by ${usd(principal - before)} USDC, not the ${usd(PROVE_STAKE)} I deposited`);
    }
    say(`I signed an EIP-712 request and decrypted my own principal: ${usd(principal)} USDC, up by exactly what I deposited`);

    const stranger = hre.ethers.Wallet.createRandom().connect(hre.ethers.provider);
    let refused = "";
    try {
      await userDecrypt(hre, await ctx.vault.confidentialBalanceOf(address), ctx.addresses.vault, stranger);
    } catch (error) {
      refused = decryptRefusal(error) ?? firstLine(error);
    }
    if (refused === "") throw new ProveFailed("a wallet with no claim on my balance decrypted it, which must never happen");
    say(`a fresh wallet ${stranger.address} asked for the same handle and was refused: ${refused}`);

    for (let pass = 0; pass < 3; pass++) {
      const outcome = await driveDraw(ctx, keeper);
      if (outcome.closed === null && outcome.awarded === null) break;
    }
    let target = await newestOwnDraw(ctx, address, Number(await ctx.vault.currentPeriod()));

    if (target === null) {
      const ends = await ctx.vault.periodEnd(depositPeriod);
      const left = ends - (await chainNow(hre)) + 15n;
      if (hre.network.name === "sepolia" && !args.wait) {
        throw new ProveFailed(
          `I hold no weight in an awarded draw yet: the first draw I appear in is ${depositPeriod}, whose period ends ` +
            `at ${at(ends)}, in ${duration(left)}. Run this again after that, or add --wait true to wait here.`,
        );
      }
      if (hre.network.name === "sepolia") {
        console.log(`  waiting ${duration(left)} for period ${depositPeriod} to end, because odds are weighted by the whole period`);
        await new Promise((done) => setTimeout(done, Number(left) * 1000));
      } else if (left > 0n) {
        await warp(hre, left);
        console.log(`  moved the local clock past the end of period ${depositPeriod}, into period ${await ctx.vault.currentPeriod()}`);
      }
      for (let pass = 0; pass < 3 && target === null; pass++) {
        const outcome = await driveDraw(ctx, keeper);
        target = await newestOwnDraw(ctx, address, Number(await ctx.vault.currentPeriod()));
        if (target === null && outcome.closed === null && outcome.awarded === null) break;
      }
    }
    if (target === null) {
      throw new ProveFailed("no awarded draw holds a weight of mine, so there is nothing of mine to check yet");
    }
    const drawId = target;
    say(`I drove every pending draw from the keeper account and picked draw ${drawId}, the newest awarded draw I hold a weight in`);

    say(
      `draw ${drawId} was closed, awarded against a KMS-signed seed and evaluated for every saver, and the ` +
        `${usd(PROVE_STAKE)} USDC I just deposited counts from period ${depositPeriod} onward, weighted by the part ` +
        "of that period that was still to run",
    );

    const weight = await userDecrypt(hre, await ctx.vault.weightHandle(drawId, address), ctx.addresses.vault, saver);
    const credit = await userDecrypt(hre, await ctx.vault.creditHandle(drawId, address), ctx.addresses.vault, saver);
    say(`I decrypted my own weight for that draw, ${group(weight)} balance-seconds, and my credit, ${usd(credit)} USDC`);

    const params = await ctx.pool.drawParams(drawId);
    let expected = 0n;
    for (let tier = 0; tier < TIER_NAMES.length; tier++) {
      for (let index = 0; index < Number(params.prizeCount[tier]); index++) {
        const [threshold, skipped] = await ctx.vault.thresholdOf(drawId, address, tier, index);
        if (skipped) break;
        if (weight > threshold) expected += params.prize[tier];
      }
    }
    if (credit > expected) {
      throw new ProveFailed(`I was credited ${usd(credit)} USDC but the public thresholds only allow ${usd(expected)}`);
    }
    const clamped = expected === credit ? "which matches to the unit" : "the difference being a tier that ran out of prize money";
    say(`I recomputed my own outcome from the public thresholds: ${usd(expected)} USDC against the ${usd(credit)} credited, ${clamped}`);

    // Exactly the stake plus the winnings, never withdrawAll, so the seeded principal stays in the
    // pool and running this again finds the demo exactly as it was.
    const winnings = await userDecrypt(hre, await ctx.vault.confidentialWinningsOf(address), ctx.addresses.vault, saver);
    const asked = PROVE_STAKE + winnings;
    const input = await hre.fhevm.createEncryptedInput(ctx.addresses.vault, address).add64(asked).encrypt();
    const receipt = await mine(ctx.vault.connect(saver).withdraw(input.handles[0], input.inputProof));

    const leftInPool = await userDecrypt(hre, await ctx.vault.confidentialBalanceOf(address), ctx.addresses.vault, saver);
    const leftUnclaimed = await userDecrypt(hre, await ctx.vault.confidentialWinningsOf(address), ctx.addresses.vault, saver);
    if (leftInPool !== before) {
      throw new ProveFailed(`my principal is ${usd(leftInPool)} USDC after the withdrawal, not the ${usd(before)} I started with`);
    }
    if (leftUnclaimed !== 0n) {
      throw new ProveFailed(`${usd(leftUnclaimed)} USDC of winnings is still unclaimed, so the withdrawal did not take all of it`);
    }
    say(
      `I withdrew exactly the ${usd(PROVE_STAKE)} I deposited plus ${usd(winnings)} of winnings, in one confidential ` +
        `transfer that looks the same whether or not I won, leaving my ${usd(before)} of seeded principal in the pool`,
      receipt.gasUsed,
    );

    const walletAfter = await userDecrypt(hre, await ctx.asset.confidentialBalanceOf(address), ctx.addresses.asset, saver);
    const grew = walletAfter - walletBefore;
    if (grew !== asked) {
      throw new ProveFailed(`my confidential wallet grew by ${usd(grew)} USDC, but I withdrew ${usd(asked)} USDC`);
    }
    say(
      `my confidential wallet went from ${usd(walletBefore)} to ${usd(walletAfter)} USDC, up by the ${usd(PROVE_STAKE)} ` +
        `I put in plus ${usd(winnings)} of winnings`,
    );

    console.log(
      `Every step above happened on chain on ${hre.network.name}: the deposit, the draw, the KMS-signed seed, the ` +
        "evaluation and the withdrawal. Nothing was mocked and no number came from this script.",
    );
  });
