"use client";

import { useCallback, useEffect, useState } from "react";
import type { Hex } from "viem";
import { useAccount } from "wagmi";
import { useZamaSDK } from "@/components/app/Providers";
import { routeError, type RoutedError } from "@/lib/zama/errors";
import type { HearthConfig } from "./useHearth";

export type UnshieldStage =
  | { kind: "idle" }
  | { kind: "unwrapping" }
  | { kind: "waiting" }
  | { kind: "finalizing" }
  | { kind: "done"; hash: Hex }
  | { kind: "failed"; error: RoutedError };

/**
 * Unwrapping confidential USDC back to plain USDC.
 *
 * Two transactions, because the wrapper burns the encrypted amount and marks it for public
 * decryption first and releases the plain tokens second. A reload between the two leaves the
 * first one paid for and the second one owed, so the SDK remembers the pending unwrap and the
 * app offers to finish it. Resuming is deliberately a button rather than something that happens
 * on load: nothing should send a transaction because a page opened.
 */
export function useUnshield(config: HearthConfig) {
  const sdk = useZamaSDK();
  const { address } = useAccount();
  const [stage, setStage] = useState<UnshieldStage>({ kind: "idle" });
  const [pending, setPending] = useState<Hex | null>(null);

  const readPending = useCallback(async (): Promise<Hex | null> => {
    if (!sdk || !config.asset || !address) return null;
    try {
      return await sdk.createWrappedToken(config.asset).getPendingUnshield();
    } catch {
      return null;
    }
  }, [sdk, config.asset, address]);

  const checkPending = useCallback(async () => {
    setPending(await readPending());
  }, [readPending]);

  useEffect(() => {
    let cancelled = false;
    void readPending().then((value) => {
      if (!cancelled) setPending(value);
    });
    return () => {
      cancelled = true;
    };
  }, [readPending]);

  const unshield = useCallback(
    async (amount: bigint, onDone?: () => void) => {
      if (!sdk || !config.asset) {
        setStage({ kind: "failed", error: { message: "Connect a wallet first.", remedy: "connect", retryable: false } });
        return;
      }
      setStage({ kind: "unwrapping" });
      try {
        const token = sdk.createWrappedToken(config.asset);
        const result = await token.unshield(amount, {
          onUnwrapSubmitted: () => setStage({ kind: "waiting" }),
          onFinalizing: () => setStage({ kind: "finalizing" }),
        });
        setStage({ kind: "done", hash: result.txHash });
        await checkPending();
        onDone?.();
      } catch (error) {
        setStage({ kind: "failed", error: routeError(error) });
        await checkPending();
      }
    },
    [sdk, config.asset, checkPending],
  );

  const resume = useCallback(
    async (onDone?: () => void) => {
      if (!sdk || !config.asset || !pending) return;
      setStage({ kind: "finalizing" });
      try {
        const result = await sdk.createWrappedToken(config.asset).resumeUnshield(pending);
        setStage({ kind: "done", hash: result.txHash });
        setPending(null);
        onDone?.();
      } catch (error) {
        const routed = routeError(error);
        // A finalize that lands twice means the first one already succeeded, so the amount is
        // home and the only thing left is to stop offering the resume.
        if (/already|no pending|not found/i.test(routed.message)) {
          setPending(null);
          setStage({ kind: "idle" });
          onDone?.();
          return;
        }
        setStage({ kind: "failed", error: routed });
        await checkPending();
      }
    },
    [sdk, config.asset, pending, checkPending],
  );

  const dismiss = useCallback(() => setStage({ kind: "idle" }), []);

  return { stage, pending, unshield, resume, dismiss, busy: stage.kind === "unwrapping" || stage.kind === "waiting" || stage.kind === "finalizing" };
}
