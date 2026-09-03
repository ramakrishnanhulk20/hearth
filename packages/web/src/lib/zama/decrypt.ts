import type { ZamaSDK } from "@zama-fhe/sdk";
import type { Address, Hex } from "viem";
import { isBadKmsShare, isNotReadyYet } from "./errors";

export const ZERO_HANDLE = "0x0000000000000000000000000000000000000000000000000000000000000000";

export function isZeroHandle(handle: string | null | undefined): boolean {
  return !handle || /^0x0*$/.test(handle);
}

/** What the panel says while a decryption is working through a recoverable failure. */
export type DecryptNote = "asking" | "sealing" | "new-key";

export type DecryptOptions = {
  onNote?: (note: DecryptNote, attempt: number) => void;
  signal?: AbortSignal;
};

/**
 * How many times each recovery is worth trying. They do not share a budget: a wait for the
 * coprocessor to catch up is long, and redrawing a KMS share is one round trip. The redraw budget
 * is the larger of the two because the bad share is drawn more often than not.
 */
const NOT_READY_TRIES = 5;
const NEW_KEY_TRIES = 8;

const wait = (ms: number, signal?: AbortSignal) =>
  new Promise<void>((resolve, reject) => {
    const timer = setTimeout(resolve, ms);
    signal?.addEventListener(
      "abort",
      () => {
        clearTimeout(timer);
        reject(new Error("cancelled"));
      },
      { once: true },
    );
  });

/**
 * Decrypts values this wallet is allowed on, retrying the two failures that are worth retrying.
 *
 * Never called on render. Every caller is a Reveal button, because a user decryption costs an
 * EIP-712 signature and reveals the number in the browser, and neither should happen because a
 * page loaded.
 */
export async function decryptOwn(
  sdk: ZamaSDK,
  items: { handle: Hex; contractAddress: Address }[],
  options: DecryptOptions = {},
): Promise<bigint[]> {
  const wanted = items.filter((item) => !isZeroHandle(item.handle));
  if (wanted.length === 0) return items.map(() => 0n);

  let notReady = 0;
  let newKey = 0;
  let delay = 2_000;

  for (;;) {
    try {
      options.onNote?.("asking", notReady + newKey);
      const values = await sdk.decryption.decryptValues(
        wanted.map((item) => ({ encryptedValue: item.handle, contractAddress: item.contractAddress })),
      );
      const byHandle = new Map<string, unknown>();
      for (const [key, value] of Object.entries(values)) byHandle.set(key.toLowerCase(), value);
      return items.map((item) => {
        if (isZeroHandle(item.handle)) return 0n;
        const value = byHandle.get(item.handle.toLowerCase());
        return toBigint(value);
      });
    } catch (error) {
      if (options.signal?.aborted) throw error;

      if (isBadKmsShare(error)) {
        newKey += 1;
        if (newKey > NEW_KEY_TRIES) throw error;
        // The bad share is bound to this transport key pair, so only a fresh pair redraws it.
        await sdk.permits.clear();
        options.onNote?.("new-key", newKey);
        continue;
      }

      if (isNotReadyYet(error)) {
        notReady += 1;
        if (notReady > NOT_READY_TRIES) throw error;
        options.onNote?.("sealing", notReady);
        await wait(delay, options.signal);
        delay = Math.min(delay * 2, 15_000);
        continue;
      }

      throw error;
    }
  }
}

/**
 * euint8, euint16 and euint32 come back as JavaScript numbers and everything wider as a bigint.
 * The legacy relayer SDK returned bigints throughout, which is why this only matters from
 * @zama-fhe/sdk onward.
 */
export function toBigint(value: unknown): bigint {
  if (typeof value === "bigint") return value;
  if (typeof value === "number") return BigInt(value);
  if (typeof value === "boolean") return value ? 1n : 0n;
  if (typeof value === "string") return BigInt(value);
  throw new Error(`a cleartext came back as ${typeof value}, and a number was expected`);
}

export function toBoolean(value: unknown): boolean {
  if (typeof value === "boolean") return value;
  return toBigint(value) !== 0n;
}

/**
 * One public decryption with its KMS proof. The clear values come back in the order the handles
 * were asked in, and that order is the contract rather than a convenience: awardDraw re-encodes
 * the values in the same order and checks the signature over that encoding, so asking in any
 * other order makes the on-chain check revert.
 */
export async function decryptPublic(
  sdk: ZamaSDK,
  handles: Hex[],
  options: DecryptOptions = {},
): Promise<{ values: unknown[]; proof: Hex }> {
  let notReady = 0;
  let delay = 3_000;

  for (;;) {
    try {
      options.onNote?.("asking", notReady);
      const published = await sdk.decryption.decryptPublicValues(handles);
      const byHandle = new Map<string, unknown>();
      for (const [key, value] of Object.entries(published.clearValues)) byHandle.set(key.toLowerCase(), value);
      const values = handles.map((handle) => {
        const value = byHandle.get(handle.toLowerCase());
        if (value === undefined) throw new Error(`the relayer returned no cleartext for ${handle}`);
        return value;
      });
      return { values, proof: published.decryptionProof as Hex };
    } catch (error) {
      if (options.signal?.aborted) throw error;
      // A public decryption has no transport key pair to throw away, so a bad share is waited out
      // rather than redrawn.
      if (!isNotReadyYet(error) && !isBadKmsShare(error)) throw error;
      notReady += 1;
      if (notReady > NOT_READY_TRIES + 3) throw error;
      options.onNote?.("sealing", notReady);
      await wait(delay, options.signal);
      delay = Math.min(delay * 2, 20_000);
    }
  }
}
