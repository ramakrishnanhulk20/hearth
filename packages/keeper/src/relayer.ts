import { JsonRpcProvider } from "ethers";
import { ZamaSDK, createConfig, memoryStorage } from "@zama-fhe/sdk";
import type { DecryptPublicValuesResult, EncryptedValue } from "@zama-fhe/sdk";
import { EthersProvider } from "@zama-fhe/sdk/ethers";
import { sepolia } from "@zama-fhe/sdk/chains";
import { node } from "@zama-fhe/sdk/node";
import type { KeeperConfig } from "./config.js";
import type { RetryHooks, RetryPolicy } from "./retry.js";
import { isRetryableRelayerError, withRetry } from "./retry.js";

/**
 * Every shape a decrypted value arrives in. `euint8`, `euint16` and `euint32` come back as
 * JavaScript numbers and everything wider as a bigint, so an award's scale count is a number while
 * its seed and harvest are bigints. The legacy relayer SDK returned bigints throughout, which is
 * why this only matters from `@zama-fhe/sdk` onward.
 */
export type ClearValue = bigint | boolean | number | string;

export interface PublicDecryption {
  /** Cleartexts in the same order as the handles that were asked for. The contracts verify the
   * proof against exactly that order, so the order is the contract, not a convenience. */
  readonly values: readonly ClearValue[];
  readonly proof: string;
}

export interface DecryptOptions {
  readonly signal?: AbortSignal;
}

/** The one SDK call the keeper makes, so a test can stand in for it without building an SDK. */
export interface DecryptSource {
  decryptPublicValues(handles: EncryptedValue[], options?: DecryptOptions): Promise<DecryptPublicValuesResult>;
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

/** Pairs each requested handle with its cleartext. The SDK returns a map keyed by handle and
 * says nothing about key case, so the lookup is case insensitive. */
export function orderValues(handles: readonly string[], results: DecryptPublicValuesResult): ClearValue[] {
  const byHandle = new Map<string, unknown>();
  for (const [key, value] of Object.entries(results.clearValues)) {
    byHandle.set(key.toLowerCase(), value);
  }
  return handles.map((handle) => {
    const value = byHandle.get(handle.toLowerCase());
    if (value === undefined) {
      throw new DecryptError(`The relayer returned no cleartext for handle ${handle}`);
    }
    const kind = typeof value;
    if (kind !== "bigint" && kind !== "number" && kind !== "boolean" && kind !== "string") {
      throw new DecryptError(`The cleartext of ${handle} came back as ${kind}, expected a number or a flag`);
    }
    return value as ClearValue;
  });
}

/** The SDK types a handle as 0x-prefixed hex, which is what a bytes32 read off the chain is. */
function asHandle(handle: string): EncryptedValue {
  if (!/^0x[0-9a-fA-F]{64}$/.test(handle)) {
    throw new DecryptError(`${handle} is not a 32 byte handle`);
  }
  return handle as EncryptedValue;
}

export function asBigint(value: ClearValue | undefined, what: string): bigint {
  if (typeof value === "bigint") return value;
  if (typeof value === "number") return BigInt(value);
  if (typeof value === "boolean") return value ? 1n : 0n;
  if (typeof value === "string") return BigInt(value);
  throw new DecryptError(`${what} came back as ${typeof value}, expected a number`);
}

export function asBoolean(value: ClearValue | undefined, what: string): boolean {
  if (typeof value === "boolean") return value;
  if (typeof value === "number") return value !== 0;
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
 * Wraps one SDK instance so that decryptions are serialised and retried.
 *
 * Serialised because the coprocessor event cursor is shared per instance, and two overlapping
 * requests make the second one read a block range the first already consumed. Retried because a
 * handle published seconds ago is not decryptable yet.
 */
export function createDecryptor(source: DecryptSource, options: DecryptorOptions): Decryptor {
  let queue: Promise<unknown> = Promise.resolve();

  const request = async (handles: readonly string[]): Promise<PublicDecryption> => {
    const asked = [...handles];
    const wanted = asked.map(asHandle);
    const results = await withRetry(
      () => source.decryptPublicValues([...wanted], { signal: AbortSignal.timeout(options.timeoutMs) }),
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

/**
 * The keeper only ever asks for public decryptions, which are signer-independent, so the SDK is
 * built with a provider and no wallet at all. It cannot user-decrypt a saver's handle even by
 * mistake, and no key of the keeper's ever reaches Zama's relayer.
 */
export function connectRelayer(config: KeeperConfig, provider: JsonRpcProvider, hooks?: RetryHooks): Decryptor {
  const sdk = new ZamaSDK(
    createConfig({
      chains: [{ ...sepolia, network: config.rpcUrl }],
      // The ethers adapter's createConfig has no provider-only variant, so the provider is
      // wrapped by hand and handed to the generic one.
      provider: new EthersProvider({ provider }),
      storage: memoryStorage,
      relayers: { [sepolia.id]: node() },
    }),
  );
  const options: DecryptorOptions = {
    policy: {
      attempts: config.relayer.attempts,
      baseDelayMs: config.relayer.baseDelayMs,
      maxDelayMs: config.relayer.maxDelayMs,
    },
    timeoutMs: config.relayer.timeoutMs,
    ...(hooks === undefined ? {} : { hooks }),
  };
  return createDecryptor(
    {
      decryptPublicValues: (handles, decryptOptions) =>
        sdk.decryption.decryptPublicValues(handles, decryptOptions),
    },
    options,
  );
}
