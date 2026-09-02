import { createInstance, SepoliaConfig } from "@zama-fhe/relayer-sdk/node";
import type { PublicDecryptResults } from "@zama-fhe/relayer-sdk/node";
import type { KeeperConfig } from "./config.js";
import type { RetryHooks, RetryPolicy } from "./retry.js";
import { isRetryableRelayerError, withRetry } from "./retry.js";

export type ClearValue = bigint | boolean | string;

export interface PublicDecryption {
  /** Cleartexts in the same order as the handles that were asked for. The contracts verify the
   * proof against exactly that order, so the order is the contract, not a convenience. */
  readonly values: readonly ClearValue[];
  readonly proof: string;
}

export interface DecryptOptions {
  readonly signal?: AbortSignal;
}

export interface DecryptSource {
  publicDecrypt(handles: string[], options?: DecryptOptions): Promise<PublicDecryptResults>;
}

export interface Decryptor {
  publicDecrypt(handles: readonly string[]): Promise<PublicDecryption>;
}

export class DecryptError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "DecryptError";
  }
}

export interface DecryptorOptions {
  readonly policy: RetryPolicy;
  readonly timeoutMs: number;
  readonly hooks?: RetryHooks;
}

/** Pairs each requested handle with its cleartext. The relayer returns a map keyed by handle and
 * says nothing about key case, so the lookup is case insensitive. */
export function orderValues(handles: readonly string[], results: PublicDecryptResults): ClearValue[] {
  const byHandle = new Map<string, ClearValue>();
  for (const [key, value] of Object.entries(results.clearValues)) {
    byHandle.set(key.toLowerCase(), value as ClearValue);
  }
  return handles.map((handle) => {
    const value = byHandle.get(handle.toLowerCase());
    if (value === undefined) {
      throw new DecryptError(`The relayer returned no cleartext for handle ${handle}`);
    }
    return value;
  });
}

export function asBigint(value: ClearValue | undefined, what: string): bigint {
  if (typeof value === "bigint") return value;
  if (typeof value === "boolean") return value ? 1n : 0n;
  if (typeof value === "string") return BigInt(value);
  throw new DecryptError(`${what} came back as ${typeof value}, expected a number`);
}

export function asBoolean(value: ClearValue | undefined, what: string): boolean {
  if (typeof value === "boolean") return value;
  if (typeof value === "bigint") return value !== 0n;
  if (typeof value === "string") return BigInt(value) !== 0n;
  throw new DecryptError(`${what} came back as ${typeof value}, expected true or false`);
}

export interface AwardValues {
  readonly seed: bigint;
  readonly scaleCount: bigint;
  readonly nonEmpty: boolean;
  readonly harvested: bigint;
}

/** Names the four cleartexts of an award in the order awardHandles asked for them. */
export function readAward(values: readonly ClearValue[]): AwardValues {
  if (values.length !== 4) {
    throw new DecryptError(`an award needs four cleartexts, the relayer returned ${values.length}`);
  }
  return {
    seed: asBigint(values[0], "the draw seed"),
    scaleCount: asBigint(values[1], "the scale count"),
    nonEmpty: asBoolean(values[2], "the non-empty flag"),
    harvested: asBigint(values[3], "the harvest"),
  };
}

/**
 * Wraps one relayer instance so that decryptions are serialised and retried.
 *
 * Serialised because the coprocessor event cursor is shared per instance, and two overlapping
 * requests make the second one read a block range the first already consumed (DECISIONS.md,
 * 3 September). Retried because a handle published seconds ago is not decryptable yet.
 */
export function createDecryptor(source: DecryptSource, options: DecryptorOptions): Decryptor {
  let queue: Promise<unknown> = Promise.resolve();

  const request = async (handles: readonly string[]): Promise<PublicDecryption> => {
    const asked = [...handles];
    const results = await withRetry(
      () => source.publicDecrypt([...asked], { signal: AbortSignal.timeout(options.timeoutMs) }),
      options.policy,
      isRetryableRelayerError,
      options.hooks ?? {},
    );
    return { values: orderValues(asked, results), proof: results.decryptionProof };
  };

  return {
    publicDecrypt(handles: readonly string[]): Promise<PublicDecryption> {
      if (handles.length === 0) throw new DecryptError("publicDecrypt was asked for no handles");
      const next = queue.then(
        () => request(handles),
        () => request(handles),
      );
      queue = next.catch(() => undefined);
      return next;
    },
  };
}

export async function connectRelayer(config: KeeperConfig, hooks?: RetryHooks): Promise<Decryptor> {
  const instance = await createInstance({ ...SepoliaConfig, network: config.rpcUrl });
  const options: DecryptorOptions = {
    policy: {
      attempts: config.relayer.attempts,
      baseDelayMs: config.relayer.baseDelayMs,
      maxDelayMs: config.relayer.maxDelayMs,
    },
    timeoutMs: config.relayer.timeoutMs,
    ...(hooks === undefined ? {} : { hooks }),
  };
  return createDecryptor(instance as DecryptSource, options);
}
