// Covers the retry policy: which relayer failures are worth asking again about, how long the
// keeper waits between tries, and that a permanent failure is not retried forever.
// Does not cover real network timing or the relayer's own queueing.
import assert from "node:assert/strict";
import { test } from "node:test";
import { backoffDelay, errorText, isRetryableRelayerError, withRetry } from "../src/retry.js";

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
  // The relayer SDK checks the ACL against its own RPC before it calls the relayer. Every handle
  // the keeper asks about was made publicly decryptable by closeDraw in a mined transaction.
  const acl = new Error("Handle 0x11 is not allowed for public decryption");
  acl.name = "ACLPublicDecryptionError";
  assert.equal(isRetryableRelayerError(acl), true);
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
