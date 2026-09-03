"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { Address, Hex } from "viem";
import { useAccount } from "wagmi";
import { useZamaSDK } from "@/components/app/Providers";
import { decryptOwn, isZeroHandle } from "@/lib/zama/decrypt";
import { isUserRejection, routeError, type RoutedError } from "@/lib/zama/errors";

export type RevealState =
  | { kind: "locked" }
  | { kind: "working"; note: string }
  | { kind: "open" }
  | { kind: "denied" }
  | { kind: "failed"; error: RoutedError };

export type RevealRequest = { handle: Hex | null; contractAddress: Address };

const NOTES = {
  signing: "sign the request in your wallet, it costs no gas",
  asking: "decrypting in your browser",
  sealing: "the value was just written and is not decryptable yet, asking again",
  "new-key": "a KMS share failed, retrying with a new key",
} as const;

/**
 * Holds what this wallet has chosen to decrypt about itself.
 *
 * Nothing here runs on render. A user decryption costs an EIP-712 signature and puts a private
 * number on the screen, so it happens when the saver presses Reveal and at no other time. Values
 * are cached by handle, so a balance that has not moved is not asked for twice, and a balance that
 * has moved has a new handle and is asked for again on its own.
 */
export function useReveal() {
  const sdk = useZamaSDK();
  const { address } = useAccount();
  const [raw, setRaw] = useState<RevealState>({ kind: "locked" });
  const [values, setValues] = useState<Record<string, bigint>>({});
  const [openedBy, setOpenedBy] = useState<Address | null>(null);
  const abort = useRef<AbortController | null>(null);

  // Everything is derived against the connected address rather than reset in an effect, so a
  // wallet switch can never leave one frame with the previous account's numbers on screen.
  const owned = openedBy !== null && address !== undefined && openedBy === address;
  const state = useMemo<RevealState>(() => (owned ? raw : { kind: "locked" }), [owned, raw]);

  useEffect(() => () => abort.current?.abort(), []);

  const settle = useCallback(
    (next: RevealState, who: Address | undefined) => {
      setOpenedBy(who ?? null);
      setRaw(next);
    },
    [],
  );

  const reveal = useCallback(
    async (requests: RevealRequest[]) => {
      const me = address;
      if (!sdk || !me) {
        settle(
          { kind: "failed", error: { message: "Connect a wallet to decrypt your own values.", remedy: "connect", retryable: false } },
          me,
        );
        return;
      }

      const wanted = requests.filter((request) => !isZeroHandle(request.handle));
      if (wanted.length === 0) {
        // An address that has never held a value has no handle at all, which reads as a plain
        // zero. There is nothing to ask the relayer for.
        settle({ kind: "open" }, me);
        return;
      }

      const missing = wanted.filter((request) => values[String(request.handle).toLowerCase()] === undefined);
      if (missing.length === 0) {
        settle({ kind: "open" }, me);
        return;
      }

      abort.current?.abort();
      const controller = new AbortController();
      abort.current = controller;

      settle({ kind: "working", note: NOTES.signing }, me);
      try {
        const decrypted = await decryptOwn(
          sdk,
          missing.map((request) => ({ handle: request.handle as Hex, contractAddress: request.contractAddress })),
          {
            signal: controller.signal,
            onNote: (note) => settle({ kind: "working", note: NOTES[note] }, me),
          },
        );
        if (controller.signal.aborted) return;
        setValues((previous) => {
          const next = { ...previous };
          missing.forEach((request, index) => {
            next[String(request.handle).toLowerCase()] = decrypted[index];
          });
          return next;
        });
        settle({ kind: "open" }, me);
      } catch (error) {
        if (controller.signal.aborted) return;
        // Turning the signature down is a choice, not a fault, so the panel goes back to sealed.
        if (isUserRejection(error)) {
          settle({ kind: "locked" }, me);
          return;
        }
        const routed = routeError(error);
        settle(routed.code === "NOT_ENTITLED" ? { kind: "denied" } : { kind: "failed", error: routed }, me);
      }
    },
    [sdk, address, values, settle],
  );

  const hide = useCallback(() => {
    abort.current?.abort();
    setValues({});
    setOpenedBy(null);
    setRaw({ kind: "locked" });
  }, []);

  const read = useCallback(
    (target: Hex | null): bigint | null => {
      if (!owned) return null;
      if (isZeroHandle(target)) return state.kind === "open" ? 0n : null;
      const found = values[String(target).toLowerCase()];
      return found === undefined ? null : found;
    },
    [owned, values, state.kind],
  );

  return useMemo(() => ({ state, reveal, hide, read }), [state, reveal, hide, read]);
}
