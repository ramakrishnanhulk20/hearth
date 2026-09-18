// Covers the two retry policies: which relayer failures are worth asking again about, which RPC
// refusals mean "you are asking too often", how long the keeper waits between tries, and that a
// permanent failure is not retried forever.
// Does not cover real network timing, the relayer's own queueing, or the pacing that sits
// underneath the read retry: that is stagger.test.ts.
import assert from "node:assert/strict";
import { test } from "node:test";
import {
  DecryptionFailedError,
  NotEntitledError,
  RelayerRequestFailedError,
  RpcRateLimitError,
} from "@zama-fhe/sdk";
import {
  RATE_LIMIT_ATTEMPTS,
  backoffDelay,
  errorText,
  isRateLimited,
  isRetryableRelayerError,
  rateLimitDelay,
  waitOutRateLimit,
  withRetry,
} from "../src/retry.js";

const POLICY = { attempts: 4, baseDelayMs: 1_000, maxDelayMs: 8_000 };
const NOW = { sleep: async (): Promise<void> => undefined, random: (): number => 1 };

test("rate limiting and a handle that is not decryptable yet are worth another try", () => {
  assert.equal(isRetryableRelayerError(new Error("HTTP 429 rate_limited")), true);
  assert.equal(isRetryableRelayerError({ label: "not_ready_for_decryption", message: "wait" }), true);
  assert.equal(isRetryableRelayerError({ label: "protocol_overload", message: "busy" }), true);
  assert.equal(isRetryableRelayerError(new Error("fetch failed")), true);
  assert.equal(isRetryableRelayerError({ message: "boom", status: 503 }), true);
});

test("an ACL answer of not allowed is treated as a node that is behind, and asked again", () => {
  // The SDK checks the ACL against its own RPC before it calls the relayer, then folds the
  // refusal into a terminal DecryptionFailedError. Every handle the keeper asks about was made
  // publicly decryptable by closeDraw in a mined transaction, so the reason is read off the cause.
  // The name is FhevmErrorBase because @fhevm/sdk's error base overwrites it on everything it
  // throws, so only the message says what happened.
  const acl = new Error("Handle 0x11 is not allowed for public decryption");
  acl.name = "FhevmErrorBase";
  assert.equal(isRetryableRelayerError(acl), true);
  assert.equal(
    isRetryableRelayerError(new DecryptionFailedError("Public decryption failed", { cause: acl })),
    true,
  );
});

test("a KMS party serving a bad share is worth another draw of the share set", () => {
  const shares = new Error(
    "Error reconstructing all blocks: Gao decoding failure: Allowed at most 0 errors but xgcd " +
      "factor degree indicates 1.. n=13, deg=4, #shares=9",
  );
  assert.equal(
    isRetryableRelayerError(new DecryptionFailedError("Failed to decrypt encrypted values", { cause: shares })),
    true,
  );
});

test("the SDK's own verdict on a transient failure is honoured", () => {
  assert.equal(isRetryableRelayerError(new RelayerRequestFailedError("too many requests", 429)), true);
  assert.equal(isRetryableRelayerError(new RpcRateLimitError("the node throttled the ACL read")), true);
});

test("the wordings the current relayer gives a timeout, a retry limit and a server fault", () => {
  for (const message of [
    "Public decryption: Request timed out after 120000ms",
    "Public decryption: Maximum polling retry limit exceeded (10 attempts)",
    "Public decryption: Relayer SDK internal error",
  ]) {
    const fault = new Error(message);
    fault.name = "FhevmErrorBase";
    assert.equal(isRetryableRelayerError(new DecryptionFailedError("Public decryption failed", { cause: fault })), true);
  }
});

test("a refusal by the access control list is final, whatever the wording", () => {
  const refused = new NotEntitledError({
    encryptedValue: "0x11",
    contractAddress: "0x22",
    account: "0x33",
  });
  assert.equal(isRetryableRelayerError(refused), false);
  assert.equal(isRetryableRelayerError(new RelayerRequestFailedError("bad request", 400)), false);
});

test("a mistake in our own request is not retried", () => {
  assert.equal(isRetryableRelayerError(new TypeError("handles is not iterable")), false);
  assert.equal(isRetryableRelayerError(new Error("invalid handle 0x00")), false);
  assert.equal(isRetryableRelayerError(null), false);
  const badType = new Error('FHEVM Handle "17,17" is invalid. Unknown FheType: 17');
  badType.name = "FhevmHandleError";
  assert.equal(isRetryableRelayerError(badType), false);
});

test("a retryable reason hidden inside a wrapped cause is still found", () => {
  const wrapped = new Error("public decrypt failed", { cause: new Error("ECONNRESET") });
  assert.equal(isRetryableRelayerError(wrapped), true);
  assert.match(errorText(wrapped), /econnreset/);
});

test("the wait doubles each try and stops at the ceiling", () => {
  const full = (attempt: number): number => backoffDelay(attempt, POLICY, () => 1);
  assert.deepEqual([full(1), full(2), full(3), full(4), full(5)], [1_000, 2_000, 4_000, 8_000, 8_000]);
  assert.equal(backoffDelay(1, POLICY, () => 0), 500);
});

test("a call that succeeds on the second try returns its value", async () => {
  let tries = 0;
  const value = await withRetry(
    async () => {
      tries += 1;
      if (tries === 1) throw new Error("429 rate_limited");
      return "done";
    },
    POLICY,
    isRetryableRelayerError,
    NOW,
  );
  assert.equal(value, "done");
  assert.equal(tries, 2);
});

test("a permanent failure is thrown at once, without waiting", async () => {
  let tries = 0;
  let slept = 0;
  await assert.rejects(
    withRetry(
      async () => {
        tries += 1;
        throw new TypeError("bad argument");
      },
      POLICY,
      isRetryableRelayerError,
      { ...NOW, sleep: async () => { slept += 1; } },
    ),
    TypeError,
  );
  assert.equal(tries, 1);
  assert.equal(slept, 0);
});

test("a failure that never clears gives up after the configured number of tries", async () => {
  let tries = 0;
  const waits: number[] = [];
  await assert.rejects(
    withRetry(
      async () => {
        tries += 1;
        throw new Error("429 rate_limited");
      },
      POLICY,
      isRetryableRelayerError,
      { sleep: async (ms) => { waits.push(ms); }, random: () => 1 },
    ),
    /rate_limited/,
  );
  assert.equal(tries, POLICY.attempts);
  assert.deepEqual(waits, [1_000, 2_000, 4_000]);
});

// The body the endpoint actually answers with when seven keepers read at once, copied from the
// measured response.
const MEASURED_BODY = '{"code":-32007,"message":"50/second request limit reached, please contact us"}';

/** What ethers hands back for that answer: the sentence says nothing, the node's code is nested. */
function coalesced(): unknown {
  return Object.assign(new Error("could not coalesce error"), {
    code: "UNKNOWN_ERROR",
    shortMessage: "could not coalesce error",
    error: { code: -32007, message: "50/second request limit reached, please contact us" },
    info: {
      error: { code: -32007, message: "50/second request limit reached, please contact us" },
      payload: { method: "eth_call", params: [] },
    },
  });
}

test("the refusal the endpoint gives seven keepers at once is read as a rate limit", () => {
  assert.equal(isRateLimited(coalesced()), true);
  assert.equal(
    isRateLimited(
      Object.assign(new Error("server response 429 Too Many Requests"), {
        code: "SERVER_ERROR",
        shortMessage: "exceeded maximum retry limit",
        info: { responseStatus: "429 Too Many Requests", responseBody: MEASURED_BODY },
      }),
    ),
    true,
  );
  assert.equal(isRateLimited({ info: { error: { code: -32005, message: "limit exceeded" } } }), true);
  assert.equal(isRateLimited({ info: { responseBody: MEASURED_BODY } }), true);
  assert.equal(isRateLimited(new Error("read failed", { cause: coalesced() })), true);
  assert.equal(isRateLimited({ error: { message: "Too Many Requests" } }), true);
});

test("a revert, a timeout and a nonce mistake are not rate limits", () => {
  const reverted = Object.assign(new Error("execution reverted (unknown custom error)"), {
    code: "CALL_EXCEPTION",
    shortMessage: "execution reverted (unknown custom error)",
    data: "0x8baa579f",
    info: { error: { code: 3, message: "execution reverted", data: "0x8baa579f" } },
  });
  const timedOut = Object.assign(new Error("request timeout"), {
    code: "TIMEOUT",
    shortMessage: "request timeout",
    info: { timeout: 120_000 },
  });
  const nonce = Object.assign(new Error("nonce has already been used"), {
    code: "NONCE_EXPIRED",
    shortMessage: "nonce has already been used",
    info: { error: { code: -32000, message: "nonce too low" } },
  });
  for (const error of [reverted, timedOut, nonce, null, undefined, "just a string"]) {
    assert.equal(isRateLimited(error), false, `${String(error)} should not read as a rate limit`);
  }
});

test("the read wait doubles from 400ms and carries up to a quarter more at random", () => {
  const steady = (attempt: number): number => rateLimitDelay(attempt, () => 0);
  assert.deepEqual([steady(1), steady(2), steady(3), steady(4)], [400, 800, 1_600, 3_200]);
  assert.deepEqual(
    [1, 2, 3, 4].map((attempt) => rateLimitDelay(attempt, () => 1)),
    [500, 1_000, 2_000, 4_000],
  );
});

test("a read refused twice then answered comes back, after two waits", async () => {
  const waits: number[] = [];
  let tries = 0;
  const value = await waitOutRateLimit(
    async () => {
      tries += 1;
      if (tries <= 2) throw coalesced();
      return "the answer";
    },
    { sleep: async (ms) => { waits.push(ms); }, random: () => 0 },
  );
  assert.equal(value, "the answer");
  assert.equal(tries, 3);
  assert.deepEqual(waits, [400, 800]);
});

test("a read that reverts throws at once, with no wait at all", async () => {
  let waits = 0;
  let tries = 0;
  await assert.rejects(
    waitOutRateLimit(
      async () => {
        tries += 1;
        throw Object.assign(new Error("execution reverted"), { code: "CALL_EXCEPTION" });
      },
      { sleep: async () => { waits += 1; }, random: () => 0 },
    ),
    /execution reverted/,
  );
  assert.equal(tries, 1);
  assert.equal(waits, 0);
});

test("a read refused five times gives up and hands the refusal back to the pass", async () => {
  const waits: number[] = [];
  let tries = 0;
  await assert.rejects(
    waitOutRateLimit(
      async () => {
        tries += 1;
        throw coalesced();
      },
      { sleep: async (ms) => { waits.push(ms); }, random: () => 0 },
    ),
    /could not coalesce error/,
  );
  assert.equal(tries, RATE_LIMIT_ATTEMPTS);
  assert.deepEqual(waits, [400, 800, 1_600, 3_200]);
});
