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

/** The JSON-RPC codes a public endpoint answers with when the caller is asking too often. -32007
 * is what our Sepolia endpoint returns; -32005 is the older "limit exceeded" code other providers
 * still use. */
const RATE_LIMIT_CODES = new Set([-32005, -32007]);
const RATE_LIMIT_WORDS = /request limit|rate limit|too many requests/i;
const RATE_LIMIT_CODE_TEXT = /-3200[57]\b/;
const HTTP_TOO_MANY = /\b429\b/;

/** Where ethers files the endpoint's own answer. It does not put it in the message: a refused read
 * arrives as "could not coalesce error" with the node's code and body hidden underneath. */
const NESTED_FIELDS = ["cause", "error", "info", "responseBody", "responseStatus"] as const;
const TEXT_FIELDS = ["message", "shortMessage", "details", "label", "name", "statusText"] as const;
const CODE_FIELDS = ["code", "status", "statusCode"] as const;

function rateLimitFound(error: unknown, depth: number): boolean {
  if (depth > 6 || error === null || error === undefined) return false;
  if (typeof error === "string") {
    return RATE_LIMIT_WORDS.test(error) || RATE_LIMIT_CODE_TEXT.test(error) || HTTP_TOO_MANY.test(error);
  }
  if (typeof error === "number") return RATE_LIMIT_CODES.has(error) || error === 429;
  if (typeof error !== "object") return false;
  const record = error as Record<string, unknown>;
  for (const key of TEXT_FIELDS) {
    const value = record[key];
    if (typeof value === "string" && RATE_LIMIT_WORDS.test(value)) return true;
  }
  for (const key of CODE_FIELDS) {
    const value = record[key];
    if (typeof value === "number" && (RATE_LIMIT_CODES.has(value) || value === 429)) return true;
    if (typeof value === "string" && (HTTP_TOO_MANY.test(value) || RATE_LIMIT_CODE_TEXT.test(value))) return true;
  }
  for (const key of NESTED_FIELDS) {
    if (rateLimitFound(record[key], depth + 1)) return true;
  }
  return false;
}

/**
 * True when the endpoint refused the request because it was asked too often, rather than because
 * the call was wrong. Matches the HTTP status, the JSON-RPC code and the wording, at every depth
 * ethers and the SDK nest a failure to, so a limit hidden three objects down is still found.
 *
 * It deliberately does not look at revert data: a contract's own error is never a rate limit.
 */
export function isRateLimited(error: unknown): boolean {
  return rateLimitFound(error, 0);
}

/** Five tries: the endpoint counts per second, so four short waits clear anything that is going to
 * clear. Beyond that the pass ends and the next one starts fresh rather than holding a slot. */
export const RATE_LIMIT_ATTEMPTS = 5;
const RATE_LIMIT_BASE_MS = 400;

/** 400ms, 800, 1600, 3200, each with up to a quarter more at random so two keepers refused in the
 * same second do not come back in the same millisecond. */
export function rateLimitDelay(attempt: number, random: () => number): number {
  return Math.round(RATE_LIMIT_BASE_MS * 2 ** (attempt - 1) * (1 + 0.25 * random()));
}

/**
 * Runs a read, waiting out a refusal that says "too many requests" and nothing else.
 *
 * Only reads go through here. A transaction that is refused is left to the next pass, because a
 * send that may already be in the node's pool must never be retried blindly.
 */
export async function waitOutRateLimit<T>(run: () => Promise<T>, hooks: RetryHooks = {}): Promise<T> {
  const sleep = hooks.sleep ?? REAL_SLEEP;
  const random = hooks.random ?? Math.random;
  for (let attempt = 1; ; attempt++) {
    try {
      return await run();
    } catch (error) {
      if (attempt >= RATE_LIMIT_ATTEMPTS || !isRateLimited(error)) throw error;
      const delay = rateLimitDelay(attempt, random);
      hooks.onRetry?.(attempt, delay, error);
      await sleep(delay);
    }
  }
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
