import { isRetryable } from "@zama-fhe/sdk";

export interface RetryPolicy {
  readonly attempts: number;
  readonly baseDelayMs: number;
  readonly maxDelayMs: number;
}

export interface RetryHooks {
  readonly sleep?: (ms: number) => Promise<void>;
  readonly random?: () => number;
  readonly onRetry?: (attempt: number, delayMs: number, error: unknown) => void;
}

const REAL_SLEEP = (ms: number): Promise<void> => new Promise((done) => setTimeout(done, ms));

/** Walks the whole error chain, because the SDK folds a relayer or access-list failure into a
 * DecryptionFailedError of its own and the useful label sits on the cause rather than on the
 * message. */
export function errorText(error: unknown): string {
  const parts: string[] = [];
  let current: unknown = error;
  for (let depth = 0; depth < 6 && current !== null && current !== undefined; depth++) {
    if (typeof current === "string") {
      parts.push(current);
      break;
    }
    if (typeof current !== "object") break;
    const record = current as Record<string, unknown>;
    for (const key of ["name", "message", "details", "label", "shortMessage", "code"]) {
      const value = record[key];
      if (typeof value === "string" || typeof value === "number") parts.push(String(value));
    }
    const status = record["status"];
    if (typeof status === "number") parts.push(`status ${status}`);
    current = record["cause"];
  }
  return parts.join(" | ").toLowerCase();
}

/**
 * Signals that mean "ask again in a moment", not "this will never work". A freshly published
 * handle is not decryptable until the coprocessor has caught up, and the relayer rate limits.
 *
 * These sit alongside the SDK's own `isRetryable`, which covers only what its taxonomy marks
 * transient: a relayer 429 or timeout, and an RPC throttle. Everything else it collapses into a
 * terminal DecryptionFailedError, so the reason has to be read off the cause chain.
 *
 * "not allowed for public decryption" is on the list because the SDK checks the ACL against its
 * own RPC before it calls the relayer. The keeper only ever asks about handles that closeDraw
 * already made publicly decryptable, so that answer means the node is a block or two behind, not
 * that the handle is private.
 */
const RETRYABLE = [
  "429",
  "not allowed for public decryption",
  // Sepolia's KMS is thirteen parties and reconstruction takes a subset of their shares. One
  // party currently serves a share the others disagree with. The keeper only ever asks for public
  // decryptions, which carry no transport key pair for the operator tasks' recovery to redraw, so
  // asking again is the only lever here.
  "error reconstructing all blocks",
  "gao decoding failure",
  "rate_limited",
  "rate limited",
  "protocol_overload",
  "not_ready_for_decryption",
  "not yet decryptable",
  "readiness_check_timed_out",
  "response_timed_out",
  "gateway_not_reachable",
  "protocol_paused",
  "internal_server_error",
  // The wordings @fhevm/sdk 0.13 gives the same three conditions. They are matched as text
  // because its error base overwrites `name` with "FhevmErrorBase" on everything it throws, so
  // the class that was raised is not on the object to match against.
  "request timed out",
  "maximum polling retry limit exceeded",
  "relayer sdk internal error",
  "status 500",
  "status 502",
  "status 503",
  "status 504",
  "fetch failed",
  "socket hang up",
  "network error",
  "econnreset",
  "econnrefused",
  "etimedout",
  "eai_again",
  "und_err_connect_timeout",
  "und_err_socket",
];

export function isRetryableRelayerError(error: unknown): boolean {
  if (isRetryable(error)) return true;
  const text = errorText(error);
  if (text === "") return false;
  return RETRYABLE.some((needle) => text.includes(needle));
}

/** Exponential backoff with jitter in the second half of each step, so two keepers started
 * together do not hammer the relayer in lockstep. */
export function backoffDelay(attempt: number, policy: RetryPolicy, random: () => number): number {
  const step = Math.min(policy.maxDelayMs, policy.baseDelayMs * 2 ** (attempt - 1));
  return Math.round(step * (0.5 + 0.5 * random()));
}

export async function withRetry<T>(
  run: () => Promise<T>,
  policy: RetryPolicy,
  retryable: (error: unknown) => boolean,
  hooks: RetryHooks = {},
): Promise<T> {
  const sleep = hooks.sleep ?? REAL_SLEEP;
  const random = hooks.random ?? Math.random;
  let last: unknown;
  for (let attempt = 1; attempt <= policy.attempts; attempt++) {
    try {
      return await run();
    } catch (error) {
      last = error;
      if (attempt === policy.attempts || !retryable(error)) throw error;
      const delay = backoffDelay(attempt, policy, random);
      hooks.onRetry?.(attempt, delay, error);
      await sleep(delay);
    }
  }
  throw last;
}
