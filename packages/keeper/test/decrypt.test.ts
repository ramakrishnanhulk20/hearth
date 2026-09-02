// Covers how the keeper talks to the relayer: the handle order an award proof is bound to, the
// pairing of cleartexts back to handles, the coercion of the four award values, and the promise
// that two decryptions never overlap.
// Does not cover the live relayer, the KMS signatures, or whether a handle is decryptable yet.
import assert from "node:assert/strict";
import { test } from "node:test";
import type { PublicDecryptResults } from "@zama-fhe/relayer-sdk/node";
import { awardHandles } from "../src/plan.js";
import type { ClearValue, DecryptSource } from "../src/relayer.js";
import { DecryptError, asBigint, asBoolean, createDecryptor, orderValues, readAward } from "../src/relayer.js";

const POLICY = { attempts: 1, baseDelayMs: 1, maxDelayMs: 1 };

function results(pairs: Record<string, ClearValue>, proof = "0xproof"): PublicDecryptResults {
  return {
    clearValues: pairs,
    abiEncodedClearValues: "0x",
    decryptionProof: proof,
  } as unknown as PublicDecryptResults;
}

test("an award asks for the seed, the scale, the empty flag and the harvest, in that order", () => {
  const handles = awardHandles({
    seedHandle: "0xseed",
    scaleHandle: "0xscale",
    nonEmptyHandle: "0xnonempty",
    harvestHandle: "0xharvest",
  });
  assert.deepEqual(handles, ["0xseed", "0xscale", "0xnonempty", "0xharvest"]);
});

test("cleartexts come back in the order they were asked for, whatever order the relayer used", () => {
  const values = orderValues(
    ["0xaa", "0xbb", "0xcc"],
    results({ "0xcc": 3n, "0xaa": 1n, "0xbb": 2n }),
  );
  assert.deepEqual(values, [1n, 2n, 3n]);
});

test("a handle is matched whatever case the relayer echoes it in", () => {
  const values = orderValues(["0xAbCd"], results({ "0xabcd": 42n }));
  assert.deepEqual(values, [42n]);
});

test("a missing cleartext is a loud error naming the handle", () => {
  assert.throws(() => orderValues(["0xaa", "0xbb"], results({ "0xaa": 1n })), (error: unknown) => {
    assert.ok(error instanceof DecryptError);
    assert.match((error as Error).message, /0xbb/);
    return true;
  });
});

test("the four award values are named in the right order", () => {
  const award = readAward([7n, 3n, true, 1_240_000n]);
  assert.deepEqual(award, { seed: 7n, scaleCount: 3n, nonEmpty: true, harvested: 1_240_000n });
});

test("an award with the wrong number of cleartexts is refused rather than guessed at", () => {
  assert.throws(() => readAward([1n, 2n, true]), DecryptError);
});

test("a boolean handle survives being returned as a number or a hex string", () => {
  assert.equal(asBoolean(true, "flag"), true);
  assert.equal(asBoolean(0n, "flag"), false);
  assert.equal(asBoolean("0x01", "flag"), true);
  assert.equal(asBigint(true, "count"), 1n);
  assert.equal(asBigint("0x0a", "count"), 10n);
  assert.throws(() => asBoolean(undefined, "flag"), DecryptError);
});

test("two decryptions asked for at once still run one after the other", async () => {
  let inFlight = 0;
  let overlapped = false;
  const order: string[] = [];
  const source: DecryptSource = {
    async publicDecrypt(handles: string[]): Promise<PublicDecryptResults> {
      inFlight += 1;
      if (inFlight > 1) overlapped = true;
      await new Promise((done) => setTimeout(done, 5));
      inFlight -= 1;
      const handle = handles[0] ?? "0x";
      order.push(handle);
      return results({ [handle]: 1n });
    },
  };

  const decryptor = createDecryptor(source, { policy: POLICY, timeoutMs: 1_000 });
  await Promise.all([decryptor.publicDecrypt(["0xaa"]), decryptor.publicDecrypt(["0xbb"])]);

  assert.equal(overlapped, false);
  assert.deepEqual(order, ["0xaa", "0xbb"]);
});

test("a failed decryption does not block the next one", async () => {
  let call = 0;
  const source: DecryptSource = {
    async publicDecrypt(handles: string[]): Promise<PublicDecryptResults> {
      call += 1;
      if (call === 1) throw new TypeError("bad handle");
      return results({ [handles[0] ?? "0x"]: 5n });
    },
  };
  const decryptor = createDecryptor(source, { policy: POLICY, timeoutMs: 1_000 });
  await assert.rejects(decryptor.publicDecrypt(["0xaa"]));
  const second = await decryptor.publicDecrypt(["0xbb"]);
  assert.deepEqual(second.values, [5n]);
  assert.equal(second.proof, "0xproof");
});

test("asking for no handles at all is a mistake, not a request", () => {
  const decryptor = createDecryptor({ publicDecrypt: async () => results({}) }, { policy: POLICY, timeoutMs: 1 });
  assert.throws(() => decryptor.publicDecrypt([]), DecryptError);
});
