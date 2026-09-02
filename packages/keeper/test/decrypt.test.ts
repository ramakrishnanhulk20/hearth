// Covers how the keeper talks to the relayer: the handle order an award proof is bound to, the
// pairing of cleartexts back to handles, the coercion of the four award values, and the promise
// that two decryptions never overlap.
// Does not cover the live relayer, the KMS signatures, or whether a handle is decryptable yet.
import assert from "node:assert/strict";
import { test } from "node:test";
import type { DecryptPublicValuesResult, EncryptedValue } from "@zama-fhe/sdk";
import { awardHandles } from "../src/plan.js";
import type { ClearValue, DecryptSource } from "../src/relayer.js";
import { DecryptError, asBigint, asBoolean, createDecryptor, orderValues, readAward } from "../src/relayer.js";

const POLICY = { attempts: 1, baseDelayMs: 1, maxDelayMs: 1 };

/** A 32 byte handle whose last hex digits are `tail`, which is what the SDK will accept. */
function handle(tail: string): string {
  return `0x${tail.padStart(64, "0")}`;
}

const AA = handle("aa");
const BB = handle("bb");
const CC = handle("cc");

/**
 * The SDK types a clear value with branded number types (`Uint8Number` and friends), so a plain
 * JavaScript number, which is exactly what a euint8 arrives as at runtime, does not typecheck
 * against them. The cast is at this boundary so the fixtures can model what really comes back.
 */
function results(pairs: Record<string, ClearValue>, proof = "0xproof"): DecryptPublicValuesResult {
  return {
    clearValues: pairs as DecryptPublicValuesResult["clearValues"],
    abiEncodedClearValues: "0x",
    decryptionProof: proof as `0x${string}`,
  };
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
  const values = orderValues([AA, BB, CC], results({ [CC]: 3n, [AA]: 1n, [BB]: 2n }));
  assert.deepEqual(values, [1n, 2n, 3n]);
});

test("a handle is matched whatever case the relayer echoes it in", () => {
  const values = orderValues([handle("AbCd")], results({ [handle("abcd")]: 42n }));
  assert.deepEqual(values, [42n]);
});

test("a missing cleartext is a loud error naming the handle", () => {
  assert.throws(() => orderValues([AA, BB], results({ [AA]: 1n })), (error: unknown) => {
    assert.ok(error instanceof DecryptError);
    assert.match((error as Error).message, new RegExp(BB));
    return true;
  });
});

test("a cleartext of a shape no award can use is refused rather than coerced", () => {
  assert.throws(() => orderValues([AA], results({ [AA]: new Uint8Array([1]) as unknown as ClearValue })), DecryptError);
});

test("the four award values are named in the right order", () => {
  const award = readAward([7n, 3n, true, 1_240_000n]);
  assert.deepEqual(award, { seed: 7n, scaleCount: 3n, nonEmpty: true, harvested: 1_240_000n });
});

test("the scale count survives arriving as a number, which is how a euint8 comes back", () => {
  // uint8, uint16 and uint32 decrypt to JavaScript numbers and everything wider to bigints, so an
  // award mixes the two shapes in one response.
  const award = readAward([7n, 3, true, 1_240_000n]);
  assert.deepEqual(award, { seed: 7n, scaleCount: 3n, nonEmpty: true, harvested: 1_240_000n });
  assert.equal(asBigint(3, "the scale count"), 3n);
  assert.equal(asBoolean(0, "flag"), false);
  assert.equal(asBoolean(1, "flag"), true);
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
    async decryptPublicValues(handles: EncryptedValue[]): Promise<DecryptPublicValuesResult> {
      inFlight += 1;
      if (inFlight > 1) overlapped = true;
      await new Promise((done) => setTimeout(done, 5));
      inFlight -= 1;
      const asked = handles[0] ?? "0x";
      order.push(asked);
      return results({ [asked]: 1n });
    },
  };

  const decryptor = createDecryptor(source, { policy: POLICY, timeoutMs: 1_000 });
  await Promise.all([decryptor.publicDecrypt([AA]), decryptor.publicDecrypt([BB])]);

  assert.equal(overlapped, false);
  assert.deepEqual(order, [AA, BB]);
});

test("a failed decryption does not block the next one", async () => {
  let call = 0;
  const source: DecryptSource = {
    async decryptPublicValues(handles: EncryptedValue[]): Promise<DecryptPublicValuesResult> {
      call += 1;
      if (call === 1) throw new TypeError("bad handle");
      return results({ [handles[0] ?? "0x"]: 5n });
    },
  };
  const decryptor = createDecryptor(source, { policy: POLICY, timeoutMs: 1_000 });
  await assert.rejects(decryptor.publicDecrypt([AA]));
  const second = await decryptor.publicDecrypt([BB]);
  assert.deepEqual(second.values, [5n]);
  assert.equal(second.proof, "0xproof");
});

test("asking for no handles at all is a mistake, not a request", () => {
  const decryptor = createDecryptor(
    { decryptPublicValues: async () => results({}) },
    { policy: POLICY, timeoutMs: 1 },
  );
  assert.throws(() => decryptor.publicDecrypt([]), DecryptError);
});

test("something that is not a 32 byte handle never reaches the relayer", async () => {
  let called = false;
  const source: DecryptSource = {
    async decryptPublicValues(): Promise<DecryptPublicValuesResult> {
      called = true;
      return results({});
    },
  };
  const decryptor = createDecryptor(source, { policy: POLICY, timeoutMs: 1_000 });
  await assert.rejects(decryptor.publicDecrypt(["0xaa"]), DecryptError);
  assert.equal(called, false);
});
