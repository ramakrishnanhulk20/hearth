import { matchZamaError } from "@zama-fhe/sdk";

/** What the app can offer the saver next. The console turns each of these into a button. */
export type Remedy = "approve" | "faucet" | "wrap" | "switch" | "connect" | "retry" | "none";

export type RoutedError = {
  /**
   * A key in the `errors` namespace. Null only where the failure has no sentence of ours, which is
   * the unrecognised case: then `raw` carries whatever the stack said, in whatever language it
   * said it.
   */
  key: string | null;
  values?: Record<string, string | number>;
  /** The original first line, kept for the unrecognised case and for callers that match on it. */
  raw: string;
  remedy: Remedy;
  /** True when nothing is wrong with the request and asking again is the whole fix. */
  retryable: boolean;
  /** The SDK's own code where it had one, so a caller can branch on the exact case. */
  code?: string;
};

/** Every nested shape viem, ethers and the FHE backend hide a lower-level failure under. */
function chain(error: unknown): Record<string, unknown>[] {
  const nodes: Record<string, unknown>[] = [];
  let current: unknown = error;
  for (let depth = 0; depth < 8 && current !== null && current !== undefined; depth++) {
    if (typeof current !== "object") break;
    const node = current as Record<string, unknown>;
    nodes.push(node);
    current = node["cause"] ?? node["error"] ?? node["info"];
  }
  return nodes;
}

function text(error: unknown): string {
  return chain(error)
    .map((node) => {
      const parts = [node["shortMessage"], node["message"], node["details"], node["reason"]];
      return parts.filter((part) => typeof part === "string").join(" ");
    })
    .join(" ")
    .toLowerCase();
}

function firstLine(error: unknown): string {
  const raw =
    (error as { shortMessage?: string })?.shortMessage ??
    (error instanceof Error ? error.message.split("\n")[0] : String(error));
  return raw.length > 180 ? `${raw.slice(0, 177)}...` : raw;
}

/**
 * Sepolia's KMS reconstructs a user decryption from nine of thirteen shares. One party currently
 * serves a share the others disagree with, and the bad share is bound to the caller's transport
 * key pair, so waiting never helps and a fresh key pair is the only thing that redraws it.
 * Measured on 2 September 2026: six failures out of six under the same key pair, success on the
 * third try when the key pair was regenerated between tries.
 */
export function isBadKmsShare(error: unknown): boolean {
  const lowered = text(error);
  return lowered.includes("error reconstructing all blocks") || lowered.includes("gao decoding failure");
}

/**
 * A handle written seconds ago is not decryptable until the coprocessor and the node have caught
 * up with the block that wrote it, so a first refusal on a fresh handle is normal.
 */
export function isNotReadyYet(error: unknown): boolean {
  const lowered = text(error);
  return (
    lowered.includes("not allowed for public decryption") ||
    lowered.includes("request timed out") ||
    lowered.includes("maximum polling retry limit exceeded") ||
    lowered.includes("relayer sdk internal error") ||
    lowered.includes("fetch failed") ||
    lowered.includes("socket hang up")
  );
}

export function isUserRejection(error: unknown): boolean {
  const lowered = text(error);
  return (
    lowered.includes("user rejected") ||
    lowered.includes("rejected the request") ||
    lowered.includes("user denied") ||
    lowered.includes("denied the request")
  );
}

/**
 * Contract reverts a saver can actually hit, each answered with what to do next.
 *
 * The custom error's own name is the message key, so a new revert in the contracts needs one line
 * here and one line in every message file rather than a second naming scheme in between.
 */
const REVERTS: Record<string, { remedy: Remedy; retryable: boolean }> = {
  EnforcedPause: { remedy: "none", retryable: false },
  NotASaver: { remedy: "none", retryable: false },
  NotTheAsset: { remedy: "wrap", retryable: false },
  DrawNotAwarded: { remedy: "none", retryable: false },
  EvaluationWindowClosed: { remedy: "none", retryable: false },
  EvaluationWindowOpen: { remedy: "none", retryable: false },
  AlreadyFinalized: { remedy: "none", retryable: false },
  DrawNotOpen: { remedy: "none", retryable: false },
  AlreadyClosed: { remedy: "none", retryable: false },
  NothingToClose: { remedy: "none", retryable: false },
  CloseWindowClosed: { remedy: "none", retryable: false },
  WrongStatus: { remedy: "retry", retryable: true },
  CarryNotPending: { remedy: "none", retryable: false },
  InvalidKMSSignatures: { remedy: "retry", retryable: true },
};

/**
 * Refusals the app raises itself before anything is signed, tagged on the thrown error with the
 * same `errorName` field viem uses for a contract revert, so one lookup covers both.
 */
const APP_REFUSALS: Record<string, Remedy> = {
  addressesMissing: "none",
  drawNotWaiting: "none",
};

function taggedName(error: unknown): { name: string; node: Record<string, unknown> } | null {
  for (const node of chain(error)) {
    const data = node["data"] as { errorName?: unknown } | undefined;
    if (data && typeof data.errorName === "string") return { name: data.errorName, node };
    const name = node["errorName"];
    if (typeof name === "string") return { name, node };
  }
  return null;
}

function revertName(error: unknown): string | null {
  const tagged = taggedName(error);
  if (tagged) return tagged.name;
  const lowered = text(error);
  for (const key of Object.keys(REVERTS)) {
    if (lowered.includes(key.toLowerCase())) return key;
  }
  return null;
}

/**
 * Turns anything thrown by the SDK, viem or a contract into one message key and one thing to do.
 * The SDK's own codes are matched first, because they carry the remedy the SDK already worked out.
 *
 * Nothing here returns a sentence. The screen that shows the failure is the one that knows what
 * language it is in, so this names the sentence and lets that screen say it.
 */
export function routeError(error: unknown): RoutedError {
  const raw = firstLine(error);

  if (isUserRejection(error)) {
    return { key: "userRejected", raw, remedy: "none", retryable: false };
  }

  const matched = matchZamaError<RoutedError>(error, {
    INSUFFICIENT_ALLOWANCE: () => ({
      key: "insufficientAllowance",
      raw,
      remedy: "approve",
      retryable: false,
    }),
    INSUFFICIENT_ERC20_BALANCE: () => ({
      key: "insufficientErc20",
      raw,
      remedy: "faucet",
      retryable: false,
    }),
    INSUFFICIENT_CONFIDENTIAL_BALANCE: () => ({
      key: "insufficientConfidential",
      raw,
      remedy: "wrap",
      retryable: false,
    }),
    CHAIN_MISMATCH: () => ({ key: "chainMismatch", raw, remedy: "switch", retryable: false }),
    NOT_ENTITLED: () => ({
      key: "notEntitled",
      raw,
      remedy: "none",
      retryable: false,
      code: "NOT_ENTITLED",
    }),
    NO_CIPHERTEXT: () => ({
      key: "noCiphertext",
      raw,
      remedy: "none",
      retryable: false,
      code: "NO_CIPHERTEXT",
    }),
    RELAYER_REQUEST_FAILED: (relayerError) => {
      const status = (relayerError as unknown as { status?: number }).status;
      if (status === 429) {
        return { key: "relayerRateLimited", raw, remedy: "retry", retryable: true };
      }
      return status
        ? { key: "relayerUnreachableStatus", values: { status }, raw, remedy: "retry", retryable: true }
        : { key: "relayerUnreachable", raw, remedy: "retry", retryable: true };
    },
    RPC_RATE_LIMITED: () => ({ key: "rpcRateLimited", raw, remedy: "retry", retryable: true }),
    SIGNING_REJECTED: () => ({ key: "signingRejected", raw, remedy: "none", retryable: false }),
    WALLET_NOT_CONNECTED: () => ({ key: "notConnected", raw, remedy: "connect", retryable: false }),
    SIGNER_NOT_CONFIGURED: () => ({ key: "notConnected", raw, remedy: "connect", retryable: false }),
  });
  if (matched) return matched;

  const tagged = taggedName(error);
  if (tagged && APP_REFUSALS[tagged.name]) {
    const drawId = tagged.node["drawId"];
    return {
      key: tagged.name,
      values: typeof drawId === "number" ? { drawId } : undefined,
      raw,
      remedy: APP_REFUSALS[tagged.name],
      retryable: false,
    };
  }

  const name = revertName(error);
  if (name && REVERTS[name]) return { key: name, raw, ...REVERTS[name] };

  const lowered = text(error);
  if (lowered.includes("insufficient funds")) {
    return { key: "noGas", raw, remedy: "none", retryable: false };
  }
  if (isNotReadyYet(error)) {
    return { key: "relayerBehind", raw, remedy: "retry", retryable: true };
  }

  return { key: null, raw: raw || "", remedy: "retry", retryable: false };
}
