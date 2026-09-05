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

/** One panel's view of the store: its own open state, and the values it has asked for. */
export type RevealScope = {
  state: RevealState;
  open: boolean;
  reveal: (requests: RevealRequest[]) => void;
  hide: () => void;
  read: (handle: Hex | null) => bigint | null;
};

export type Reveal = {
  /** Binds a panel to its own reveal state. Two scopes can be open at the same time. */
  scope: (key: string) => RevealScope;
};

/**
 * Where a reveal has got to, as keys into `console.reveal` rather than sentences. The note is
 * rendered by whichever figure owns the eye, and that is the component that knows the language.
 */
const NOTES = {
  signing: "signing",
  asking: "asking",
  sealing: "sealing",
  "new-key": "newKey",
} as const;

const LOCKED: RevealState = { kind: "locked" };

const slot = (owner: Address | undefined, handle: Hex | null): string =>
  `${owner ?? "nobody"}:${handle ?? "none"}`.toLowerCase();

/**
 * What this wallet has chosen to decrypt about itself, held once for the page and opened
 * separately by each panel.
 *
 * Separately, because "what you hold" and a draw's own result are different questions and a
 * saver following the judge path asks both. One panel opening must not make the others look
 * open, and sealing one must not seal the rest.
 *
 * Once, because the decrypted values and Zama's permit are worth sharing. Requests are
 * serialised, so a second panel opened while the first is still working waits for the permit the
 * first one signed instead of prompting the wallet again, and a handle already decrypted is never
 * asked for twice.
 *
 * Nothing here runs on render. A user decryption costs a signature and puts a private number on
 * the screen, so it happens when a Reveal button is pressed and at no other time.
 */
export function useReveal(): Reveal {
  const sdk = useZamaSDK();
  const { address } = useAccount();
  const [states, setStates] = useState<Record<string, RevealState>>({});
  const [values, setValues] = useState<Record<string, bigint>>({});
  const [openedBy, setOpenedBy] = useState<Address | null>(null);

  // The ref is what the queued work reads, because a turn that starts after another one finishes
  // must see the values that one decrypted rather than the snapshot its own render captured.
  const cache = useRef<Record<string, bigint>>({});
  const controllers = useRef(new Map<string, AbortController>());
  const queue = useRef<Promise<unknown>>(Promise.resolve());

  // Values are keyed by owner as well as handle, so a wallet switch cannot read the previous
  // account's plaintexts, and the open states are gated on the same check.
  const owned = openedBy !== null && address !== undefined && openedBy === address;

  useEffect(() => {
    const inFlight = controllers.current;
    return () => {
      for (const controller of inFlight.values()) controller.abort();
    };
  }, []);

  const put = useCallback((key: string, next: RevealState) => {
    setStates((previous) => ({ ...previous, [key]: next }));
  }, []);

  const drop = useCallback((key: string) => {
    controllers.current.get(key)?.abort();
    controllers.current.delete(key);
    setStates((previous) => {
      if (previous[key] === undefined) return previous;
      const next = { ...previous };
      delete next[key];
      return next;
    });
  }, []);

  const run = useCallback(
    async (key: string, requests: RevealRequest[]) => {
      const me = address;
      if (!sdk || !me) {
        setOpenedBy(me ?? null);
        put(key, {
          kind: "failed",
          error: {
            key: "decryptNotConnected",
            raw: "Connect a wallet to decrypt your own values.",
            remedy: "connect",
            retryable: false,
          },
        });
        return;
      }

      const wanted = requests.filter((request) => !isZeroHandle(request.handle));
      setOpenedBy(me);
      if (wanted.length === 0) {
        // An address that has never held a value has no handle at all, which reads as a plain
        // zero. There is nothing to ask the relayer for.
        put(key, { kind: "open" });
        return;
      }

      controllers.current.get(key)?.abort();
      const controller = new AbortController();
      controllers.current.set(key, controller);
      put(key, { kind: "working", note: NOTES.signing });

      const work = async () => {
        if (controller.signal.aborted) return;
        const missing = wanted.filter((request) => cache.current[slot(me, request.handle)] === undefined);
        if (missing.length === 0) {
          put(key, { kind: "open" });
          return;
        }

        try {
          const decrypted = await decryptOwn(
            sdk,
            missing.map((request) => ({ handle: request.handle as Hex, contractAddress: request.contractAddress })),
            {
              signal: controller.signal,
              onNote: (note) => put(key, { kind: "working", note: NOTES[note] }),
            },
          );
          if (controller.signal.aborted) return;
          const next = { ...cache.current };
          missing.forEach((request, index) => {
            next[slot(me, request.handle)] = decrypted[index];
          });
          cache.current = next;
          setValues(next);
          put(key, { kind: "open" });
        } catch (error) {
          if (controller.signal.aborted) return;
          // Turning the signature down is a choice, not a fault, so the panel goes back to sealed.
          if (isUserRejection(error)) {
            put(key, LOCKED);
            return;
          }
          const routed = routeError(error);
          put(key, routed.code === "NOT_ENTITLED" ? { kind: "denied" } : { kind: "failed", error: routed });
        }
      };

      const turn = queue.current.then(work, work);
      queue.current = turn.catch(() => undefined);
      await turn;
    },
    [sdk, address, put],
  );

  const scope = useCallback(
    (key: string): RevealScope => {
      const state = owned ? (states[key] ?? LOCKED) : LOCKED;
      const open = state.kind === "open";
      return {
        state,
        open,
        reveal: (requests: RevealRequest[]) => void run(key, requests),
        hide: () => drop(key),
        read: (handle: Hex | null) => {
          if (!open) return null;
          if (isZeroHandle(handle)) return 0n;
          const found = values[slot(address, handle)];
          return found === undefined ? null : found;
        },
      };
    },
    [owned, states, values, address, run, drop],
  );

  return useMemo(() => ({ scope }), [scope]);
}

/** The saver's principal and winnings, opened by the balance panel and read by the withdraw one. */
export const BALANCE_SCOPE = "balance";

/**
 * The confidential token sitting in the wallet, which is not the balance sitting in the vault.
 *
 * Deposit and withdraw both show this one figure, and they used to name its scope differently, so
 * opening it on one screen left it sealed on the other for no reason a reader could see. One
 * value, one scope, one signature.
 */
export const WALLET_SCOPE = "wallet-confidential";

/** One scope per draw, so opening a draw's result leaves every other panel as it was. */
export const drawScope = (drawId: number): string => `draw:${drawId}`;
