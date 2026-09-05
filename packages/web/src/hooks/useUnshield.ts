"use client";

import { useCallback, useEffect, useState } from "react";
import type { Hex } from "viem";
import { useAccount } from "wagmi";
import { readContract } from "wagmi/actions";
import { useZamaSDK } from "@/components/app/Providers";
import { ERC20_ABI } from "@/lib/chain/tokenAbi";
import { wagmiConfig } from "@/lib/chain/wagmi";
import { routeError, type RoutedError } from "@/lib/zama/errors";
import type { HearthConfig } from "./useHearth";

export type UnshieldStage =
  | { kind: "idle" }
  | { kind: "unwrapping" }
  | { kind: "waiting" }
  | { kind: "finalizing" }
  /**
   * `moved` is the plain token's balance after the run minus its balance before it, both read
   * straight off the chain. Null when one of the two reads did not answer, which is not a zero
   * and must never be reported as one.
   */
  | { kind: "done"; hash: Hex; moved: bigint | null }
  | { kind: "failed"; error: RoutedError };

/**
 * Unwrapping the confidential token back to the plain ERC-20 underneath it.
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

  /**
   * The plain token sitting in this wallet, in the clear.
   *
   * The confidential side of an unshield is invisible by design, so the only public fact about
   * whether it worked is what landed on the other end. Both ends of the run are read here and the
   * difference is what the screen reports, rather than the transaction having succeeded.
   */
  const readUnderlying = useCallback(async (): Promise<bigint | null> => {
    if (!config.underlying || !address) return null;
    try {
      return await readContract(wagmiConfig, {
        address: config.underlying,
        abi: ERC20_ABI,
        functionName: "balanceOf",
        args: [address],
      });
    } catch {
      return null;
    }
  }, [config.underlying, address]);

  const unshield = useCallback(
    async (amount: bigint, onDone?: () => void) => {
      if (!sdk || !config.asset) {
        setStage({
          kind: "failed",
          error: { key: "notConnected", raw: "Connect a wallet first.", remedy: "connect", retryable: false },
        });
        return;
      }
      setStage({ kind: "unwrapping" });
      const before = await readUnderlying();
      try {
        const token = sdk.createWrappedToken(config.asset);
        const result = await token.unshield(amount, {
          onUnwrapSubmitted: () => setStage({ kind: "waiting" }),
          onFinalizing: () => setStage({ kind: "finalizing" }),
        });
        const after = await readUnderlying();
        setStage({
          kind: "done",
          hash: result.txHash,
          moved: before !== null && after !== null ? after - before : null,
        });
        await checkPending();
        onDone?.();
      } catch (error) {
        setStage({ kind: "failed", error: routeError(error) });
        await checkPending();
      }
    },
    [sdk, config.asset, checkPending, readUnderlying],
  );

  const resume = useCallback(
    async (onDone?: () => void) => {
      if (!sdk || !config.asset || !pending) return;
      setStage({ kind: "finalizing" });
      const before = await readUnderlying();
      try {
        const result = await sdk.createWrappedToken(config.asset).resumeUnshield(pending);
        const after = await readUnderlying();
        setStage({
          kind: "done",
          hash: result.txHash,
          moved: before !== null && after !== null ? after - before : null,
        });
        setPending(null);
        onDone?.();
      } catch (error) {
        const routed = routeError(error);
        // A finalize that lands twice means the first one already succeeded, so the amount is
        // home and the only thing left is to stop offering the resume.
        if (/already|no pending|not found/i.test(routed.raw)) {
          setPending(null);
          setStage({ kind: "idle" });
          onDone?.();
          return;
        }
        setStage({ kind: "failed", error: routed });
        await checkPending();
      }
    },
    [sdk, config.asset, pending, checkPending, readUnderlying],
  );

  const dismiss = useCallback(() => setStage({ kind: "idle" }), []);

  return { stage, pending, unshield, resume, dismiss, busy: stage.kind === "unwrapping" || stage.kind === "waiting" || stage.kind === "finalizing" };
}
