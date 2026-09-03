import { Contract, JsonRpcProvider, formatEther } from "ethers";
import type { ContractTransactionReceipt, ContractTransactionResponse, Interface } from "ethers";
import { checkAbis, loadAbi, structFieldIndex } from "./abi.js";
import type { KeeperConfig, LoadedKeeper } from "./config.js";
import { describeConfig } from "./config.js";
import { group, gwei, line, problem, usdc } from "./log.js";
import type { Action, DrawSnapshot, TickSnapshot } from "./plan.js";
import {
  DrawStatus,
  TIER_COUNT,
  TIER_NAMES,
  awardHandles,
  nextScanFrom,
  planAfterFinalizes,
  planFinalizes,
  walkTotal,
} from "./plan.js";
import type { Decryptor } from "./relayer.js";
import { asBigint, connectRelayer, readAward } from "./relayer.js";

/** Roughly a few draws of gas at Sepolia prices. Below this the keeper says so at boot. */
const MIN_COMFORTABLE_BALANCE = 20_000_000_000_000_000n;
const DEFAULT_PRIORITY_FEE = 1_000_000_000n;

interface DrawRow extends DrawSnapshot {
  readonly seedHandle: string;
  readonly scaleHandle: string;
  readonly nonEmptyHandle: string;
  readonly harvestHandle: string;
  readonly prize: readonly bigint[];
}

function num(value: unknown): number {
  return Number(value as bigint | number);
}

function prizeText(prize: readonly bigint[]): string {
  if (prize.length === 0) return "prize sizes not readable";
  return `${prize.length} tiers, prizes ${prize.map((value) => usdc(value)).join(" / ")} USDC`;
}

function tierName(tier: number): string {
  return TIER_NAMES[tier] ?? `tier ${tier}`;
}

export class Keeper {
  private readonly config: KeeperConfig;
  private readonly provider: JsonRpcProvider;
  private readonly pool: Contract;
  private readonly vault: Contract;
  private readonly ifaces: readonly Interface[];
  private readonly drawFields: Map<string, number>;
  private readonly decryptor: Decryptor;
  private scanFrom = 1;
  private stopped = false;
  private wake: (() => void) | null = null;

  /**
   * `connect` is the entry point for a real run: it builds the provider and the contracts and runs
   * the boot checks. This takes them ready made, which is how the tick test drives a whole pass
   * against a stub chain with no network and no wallet.
   */
  constructor(
    config: KeeperConfig,
    provider: JsonRpcProvider,
    pool: Contract,
    vault: Contract,
    drawFields: Map<string, number>,
    decryptor: Decryptor,
  ) {
    this.config = config;
    this.provider = provider;
    this.pool = pool;
    this.vault = vault;
    this.drawFields = drawFields;
    this.decryptor = decryptor;
    this.ifaces = [pool.interface, vault.interface];
  }

  static async connect(loaded: LoadedKeeper, decryptor?: Decryptor): Promise<Keeper> {
    const { config, wallet } = loaded;
    const poolAbi = loadAbi("HearthPrizePool");
    const vaultAbi = loadAbi("HearthVault");
    checkAbis(poolAbi, vaultAbi);

    const provider = new JsonRpcProvider(config.rpcUrl);
    const network = await provider.getNetwork();
    if (Number(network.chainId) !== config.chainId) {
      throw new Error(`SEPOLIA_RPC_URL points at chain ${network.chainId}, but the keeper expects ${config.chainId}.`);
    }

    for (const [name, where] of [
      ["HEARTH_POOL", config.pool],
      ["HEARTH_VAULT", config.vault],
    ] as const) {
      if ((await provider.getCode(where)) === "0x") {
        throw new Error(`There is no contract at ${where}, which ${name} points at.`);
      }
    }

    const signer = wallet.connect(provider);
    const relayer =
      decryptor ??
      connectRelayer(config, provider, {
        onRetry: (attempt, delay) =>
          line(`the relayer is not ready yet, asking again in ${Math.round(delay / 1000)}s (try ${attempt})`),
      });

    const keeper = new Keeper(
      config,
      provider,
      new Contract(config.pool, poolAbi, signer),
      new Contract(config.vault, vaultAbi, signer),
      structFieldIndex(poolAbi, "drawOf"),
      relayer,
    );
    await keeper.reportBoot();
    return keeper;
  }

  stop(): void {
    this.stopped = true;
    this.wake?.();
  }

  async run(): Promise<void> {
    while (!this.stopped) {
      try {
        await this.tick();
      } catch (error) {
        // Everything a tick can throw out of is a read: the state, the fee data, the carries.
        // A transaction that fails is caught next to the action it belongs to, so nothing here
        // was ever half sent. What the operator needs is the endpoint's own verdict, which
        // ethers keeps in `code` and hides from the sentence.
        problem(`tick failed while reading the chain: ${this.causeText(error)}`);
      }
      if (this.stopped) break;
      await this.sleep(this.config.pollMs);
    }
    line("keeper stopped");
  }

  async tick(): Promise<void> {
    const { snapshot, rows } = await this.readState();
    const finalizes = planFinalizes(snapshot);
    const rest = planAfterFinalizes(snapshot);
    this.scanFrom = nextScanFrom(this.scanFrom, snapshot.draws, snapshot.period);

    if (finalizes.length === 0 && rest.length === 0) {
      line(`nothing to do: period ${snapshot.period}${this.watching(snapshot)}`);
      return;
    }

    if (!this.config.dryRun && !(await this.gasIsAffordable())) return;

    await this.performAll(finalizes, rows);
    if (this.stopped) return;

    // A dry run sends nothing, so nothing has moved and the opening read still holds. After a
    // real finalize it does not: finalizeDraw publishes the carry of every tier whose cadence is
    // due, and openDraw leaves a pending carry out of the draw entirely. Planning the reconciles
    // from the opening read would put them one pass behind the close they belong in front of,
    // and that tier's money would sit out a whole draw. Three eth_calls buy it back.
    if (finalizes.length === 0 || this.config.dryRun) {
      await this.performAll(rest, rows);
      return;
    }
    const settled: TickSnapshot = { ...snapshot, pendingCarries: await this.readPendingCarries() };
    await this.performAll(planAfterFinalizes(settled), rows);
  }

  private async performAll(actions: readonly Action[], rows: Map<number, DrawRow>): Promise<void> {
    for (const action of actions) {
      if (this.stopped) return;
      try {
        await this.perform(action, rows);
      } catch (error) {
        problem(`${this.describe(action)} failed: ${this.causeText(error)}`);
      }
    }
  }

  private async reportBoot(): Promise<void> {
    line(`hearth keeper: ${describeConfig(this.config)}`);
    if (this.config.source !== null) line(`yield source ${this.config.source}`);

    const balance = await this.provider.getBalance(this.config.keeperAddress);
    if (balance < MIN_COMFORTABLE_BALANCE) {
      problem(`the keeper account holds only ${formatEther(balance)} ETH. Top it up on Sepolia.`);
    } else {
      line(`keeper balance ${formatEther(balance)} ETH`);
    }

    try {
      const cadence: string[] = [];
      for (let tier = 0; tier < TIER_COUNT; tier++) {
        const every = num(await this.read(this.pool, "reconcileEvery", [tier]));
        cadence.push(`${tierName(tier)} every ${every === 1 ? "draw" : `${every} draws`}`);
      }
      line(`tier reconcile cadence: ${cadence.join(", ")}`);
    } catch (error) {
      problem(`could not read the tier reconcile cadence: ${this.causeText(error)}`);
    }

    // The vault stops a batch at MAX_BATCH savers that need encrypted work, whatever count asks
    // for, so a batch above it silently does less than the log line would suggest.
    try {
      const cap = num(await this.read(this.vault, "MAX_BATCH"));
      if (this.config.batchSize > cap) {
        problem(
          `KEEPER_BATCH is ${this.config.batchSize} but the vault evaluates at most ${cap} savers per call, ` +
            `so the rest roll into the next pass. Set KEEPER_BATCH to ${cap} or below.`,
        );
      } else {
        line(`evaluating ${this.config.batchSize} savers per call, the vault allows up to ${cap}`);
      }
    } catch {
      line(`evaluating ${this.config.batchSize} savers per call`);
    }

    const period = num(await this.read(this.pool, "currentPeriod"));
    this.scanFrom =
      this.config.scanFrom > 0 ? this.config.scanFrom : Math.max(1, period - this.config.lookbackDraws);
    line(`period ${period}, watching draws from ${this.scanFrom} upward`);
  }

  private sleep(ms: number): Promise<void> {
    return new Promise((done) => {
      const timer = setTimeout(() => {
        this.wake = null;
        done();
      }, ms);
      this.wake = () => {
        clearTimeout(timer);
        this.wake = null;
        done();
      };
    });
  }

  private watching(snapshot: TickSnapshot): string {
    const open = snapshot.draws.filter((draw) => draw.status === DrawStatus.Awarded);
    if (open.length === 0) return "";
    const parts = open.map(
      (draw) => `draw ${draw.drawId} has ${draw.cursor} of ${walkTotal(draw, snapshot.saverCount)} savers evaluated`,
    );
    return `, ${parts.join(", ")}`;
  }

  private describe(action: Action): string {
    switch (action.kind) {
      case "finalize":
        return `finalizing draw ${action.drawId}`;
      case "reconcile":
        return `reconciling the ${tierName(action.tier)} tier`;
      case "close":
        return `closing draw ${action.drawId}`;
      case "award":
        return `awarding draw ${action.drawId}`;
      case "evaluate":
        return `evaluating draw ${action.drawId}`;
    }
  }

  private read(contract: Contract, signature: string, args: readonly unknown[] = []): Promise<unknown> {
    return contract.getFunction(signature)(...args) as Promise<unknown>;
  }

  private async readState(): Promise<{ snapshot: TickSnapshot; rows: Map<number, DrawRow> }> {
    const block = await this.provider.getBlock("latest");
    if (block === null) throw new Error("the node returned no latest block");

    const period = num(await this.read(this.pool, "currentPeriod"));
    const closableDraw = num(await this.read(this.pool, "closableDraw"));
    const closeDeadline = closableDraw > 0 ? num(await this.read(this.pool, "closeDeadline", [closableDraw])) : 0;
    const saverCount = num(await this.read(this.vault, "saverCount"));

    const ids = new Set<number>();
    for (let id = Math.max(1, this.scanFrom); id <= period - 1 && ids.size < this.config.lookbackDraws; id++) {
      ids.add(id);
    }
    // The two draws of the current window are always read, even when an old backlog has filled
    // the scan budget, so a live draw is never left unawarded because of history.
    for (const id of [period - 2, period - 1]) if (id >= 1) ids.add(id);

    const rows = new Map<number, DrawRow>();
    for (const id of [...ids].sort((a, b) => a - b)) rows.set(id, await this.readDraw(id));

    const pendingCarries = await this.readPendingCarries();

    const snapshot: TickSnapshot = {
      now: block.timestamp,
      period,
      closableDraw,
      closeDeadline,
      draws: [...rows.values()],
      pendingCarries,
      saverCount,
      batchSize: this.config.batchSize,
    };
    return { snapshot, rows };
  }

  /** The tiers holding a published carry that no reconcile has consumed yet. */
  private async readPendingCarries(): Promise<number[]> {
    const pending: number[] = [];
    for (let tier = 0; tier < TIER_COUNT; tier++) {
      const carry = (await this.read(this.vault, "publishedCarry", [tier])) as unknown[];
      if (carry[2] === true) pending.push(tier);
    }
    return pending;
  }

  private async readDraw(drawId: number): Promise<DrawRow> {
    const raw = (await this.read(this.pool, "drawOf", [drawId])) as unknown[];
    const at = (name: string): unknown => {
      const position = this.drawFields.get(name);
      return position === undefined ? undefined : raw[position];
    };
    const prizeRaw = at("prize");
    const base = {
      drawId,
      status: num(at("status")) as DrawStatus,
      seedHandle: String(at("seedHandle")),
      scaleHandle: String(at("scaleHandle")),
      nonEmptyHandle: String(at("nonEmptyHandle")),
      harvestHandle: String(at("harvestHandle")),
      prize: Array.isArray(prizeRaw) ? prizeRaw.map((value) => BigInt(value as bigint)) : [],
    };

    if (base.status === DrawStatus.None || base.status === DrawStatus.Closed) {
      return { ...base, finalized: false, windowEndsAt: 0, walkStart: 0, walkLength: 0, cursor: 0 };
    }

    const finalized = (await this.read(this.vault, "finalized", [drawId])) === true;
    const windowEndsAt = num(await this.read(this.vault, "windowEndsAt", [drawId]));
    if (base.status !== DrawStatus.Awarded) {
      return { ...base, finalized, windowEndsAt, walkStart: 0, walkLength: 0, cursor: 0 };
    }

    const walk = (await this.read(this.vault, "walkOf", [drawId])) as unknown[];
    return {
      ...base,
      finalized,
      windowEndsAt,
      walkStart: num(walk[0]),
      walkLength: num(walk[1]),
      cursor: num(await this.read(this.vault, "cursorOf", [drawId])),
    };
  }

  private async perform(action: Action, rows: Map<number, DrawRow>): Promise<void> {
    switch (action.kind) {
      case "finalize":
        await this.send(`finalized draw ${action.drawId}`, this.vault, "finalizeDraw", [action.drawId]);
        return;
      case "reconcile":
        await this.reconcile(action.tier);
        return;
      case "close":
        await this.close(action.drawId);
        return;
      case "award":
        await this.award(action.drawId, rows.get(action.drawId));
        return;
      case "evaluate":
        await this.send(
          `evaluated draw ${action.drawId}`,
          this.vault,
          "evaluate",
          [action.drawId, action.count],
          async () => {
            const cursor = num(await this.read(this.vault, "cursorOf", [action.drawId]));
            return `: ${cursor} of ${action.total} savers done`;
          },
        );
        return;
    }
  }

  private async close(drawId: number): Promise<void> {
    const receipt = await this.send(`closed draw ${drawId}`, this.pool, "closeDraw(uint32)", [drawId]);
    if (receipt === null) return;
    const row = await this.readDraw(drawId);
    line(`draw ${drawId} is waiting for its award: ${prizeText(row.prize)}`);
  }

  private async award(drawId: number, row: DrawRow | undefined): Promise<void> {
    if (row === undefined) throw new Error(`draw ${drawId} was not read this tick`);
    line(`draw ${drawId}: asking the relayer for the seed, the scale, the empty flag and the harvest`);
    const decrypted = await this.decryptor.publicDecrypt(awardHandles(row));
    const award = readAward(decrypted.values);

    const receipt = await this.send(
      `awarded draw ${drawId}: ${prizeText(row.prize)}, harvest ${usdc(award.harvested)} USDC`,
      this.pool,
      "awardDraw",
      [drawId, award.seed, award.scaleCount, award.nonEmpty, award.harvested, decrypted.proof],
    );
    if (receipt === null) return;

    const after = await this.readDraw(drawId);
    if (after.status === DrawStatus.Empty) {
      line(`draw ${drawId} had no savers, so its prize money goes straight back into the pool`);
    } else if (after.status === DrawStatus.Skipped) {
      line(`draw ${drawId} missed its window, so its prize money goes straight back into the pool`);
    }
  }

  private async reconcile(tier: number): Promise<void> {
    const published = (await this.read(this.vault, "publishedCarry", [tier])) as unknown[];
    if (published[2] !== true) return;
    line(`the ${tierName(tier)} tier is due, asking the relayer for its carry`);
    const decrypted = await this.decryptor.publicDecrypt([String(published[0])]);
    const carry = asBigint(decrypted.values[0], `the ${tierName(tier)} carry`);
    await this.send(
      `reconciled the ${tierName(tier)} tier: ${usdc(carry)} USDC back into the prize liquidity`,
      this.pool,
      "reconcile",
      [tier, carry, decrypted.proof],
    );
  }

  private async gasIsAffordable(): Promise<boolean> {
    const cap = this.config.maxFeePerGas;
    if (cap === null) return true;
    const fees = await this.provider.getFeeData();
    const current = fees.maxFeePerGas;
    if (current === null || current <= cap) return true;
    line(`gas is ${gwei(current)} gwei, above the ${gwei(cap)} gwei cap, so nothing is sent this tick`);
    return false;
  }

  private overrides(): Record<string, bigint> {
    const out: Record<string, bigint> = {};
    const cap = this.config.maxFeePerGas;
    if (cap !== null) {
      const priority = this.config.maxPriorityFeePerGas ?? DEFAULT_PRIORITY_FEE;
      out["maxFeePerGas"] = cap;
      out["maxPriorityFeePerGas"] = priority < cap ? priority : cap;
    } else if (this.config.maxPriorityFeePerGas !== null) {
      out["maxPriorityFeePerGas"] = this.config.maxPriorityFeePerGas;
    }
    if (this.config.gasLimit !== null) out["gasLimit"] = this.config.gasLimit;
    return out;
  }

  /**
   * Simulates every call before signing it, so a revert costs one eth_call rather than gas and
   * arrives with the contract's own error name instead of a hex blob.
   */
  private async send(
    what: string,
    contract: Contract,
    signature: string,
    args: readonly unknown[],
    detail?: () => Promise<string>,
  ): Promise<ContractTransactionReceipt | null> {
    const fn = contract.getFunction(signature);
    try {
      await fn.staticCall(...args, { from: this.config.keeperAddress });
    } catch (error) {
      problem(`${what} was refused before sending: ${this.causeText(error)}`);
      return null;
    }

    if (this.config.dryRun) {
      line(`dry run, would have sent: ${what}`);
      return null;
    }

    const tx = (await fn(...args, this.overrides())) as ContractTransactionResponse;
    const receipt = await tx.wait(this.config.confirmations);
    if (receipt === null) {
      problem(`${what}: transaction ${tx.hash} did not confirm`);
      return null;
    }
    const suffix = detail === undefined ? "" : await detail();
    line(`${what}${suffix} (gas ${group(receipt.gasUsed)})`);
    return receipt;
  }

  /**
   * Turns an ethers failure into the contract's own error name wherever the ABI can name it, and
   * otherwise into the sentence plus the endpoint's own verdict.
   *
   * The second half is what lets an operator tell a rate limit from a bug. A read that fails comes
   * back as "exceeded maximum retry limit" and nothing else, which reads the same whether the node
   * throttled us or the call was wrong; ethers keeps the difference in `code` and in the HTTP
   * status. The request URL is deliberately left out, because it carries the API key.
   */
  private causeText(error: unknown): string {
    const named = this.namedRevert(error);
    if (named !== null) return named;

    const shaped = error as { code?: unknown; info?: { responseStatus?: unknown } };
    const parts: string[] = [];
    if (typeof shaped.code === "string" && shaped.code !== "") parts.push(shaped.code);
    const status = shaped.info?.responseStatus;
    if (typeof status === "string" && status !== "") parts.push(status);

    const text = this.plainText(error);
    return parts.length === 0 ? text : `${text} (${parts.join(", ")})`;
  }

  private namedRevert(error: unknown): string | null {
    const shaped = error as {
      revert?: { name?: string; args?: readonly unknown[] } | null;
      data?: string;
      info?: { error?: { data?: string } };
      error?: { data?: string };
    };
    const named = shaped.revert;
    if (named !== null && named !== undefined && named.name !== undefined) {
      return withArgs(named.name, named.args);
    }
    const data = shaped.data ?? shaped.info?.error?.data ?? shaped.error?.data;
    if (typeof data === "string" && data.length >= 10) {
      for (const iface of this.ifaces) {
        const parsed = iface.parseError(data);
        if (parsed !== null) return withArgs(parsed.name, parsed.args);
      }
    }
    return null;
  }

  private plainText(error: unknown): string {
    const shaped = error as { shortMessage?: string; message?: string };
    return shaped.shortMessage ?? shaped.message ?? String(error);
  }
}

function withArgs(name: string, args: readonly unknown[] | undefined): string {
  if (args === undefined || args.length === 0) return name;
  return `${name}(${[...args].map((value) => String(value)).join(", ")})`;
}
