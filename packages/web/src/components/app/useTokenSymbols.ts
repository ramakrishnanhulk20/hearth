"use client";

import { useReadContracts } from "wagmi";
import { CONFIDENTIAL_ASSET_ABI } from "@/lib/chain/abis";
import { ERC20_ABI } from "@/lib/chain/tokenAbi";
import type { HearthConfig } from "@/hooks/useHearth";

export type TokenSymbols = { underlying: string; confidential: string };

type Entry = { status: "success"; result: unknown } | { status: "failure"; error: unknown };

function pick(data: readonly Entry[] | undefined, index: number, fallback: string): string {
  const entry = data?.[index];
  if (!entry || entry.status !== "success") return fallback;
  return typeof entry.result === "string" && entry.result !== "" ? entry.result : fallback;
}

/**
 * The tickers on the token pills, read from the two tokens rather than typed into the screens.
 *
 * Deposit and withdraw both call it so a token cannot read one way on one screen and another way
 * on the next. The read is cached forever, so the second caller costs nothing.
 *
 * The fallbacks cover the renders before the read lands and a node that will not answer, and they
 * come from the pool's own deployment record. A ticker is a label, never one of the figures the
 * screen has to source from the chain.
 */
export function useTokenSymbols(config: HearthConfig): TokenSymbols {
  const { underlying, asset } = config;
  const enabled = underlying !== null && asset !== null;

  const { data } = useReadContracts({
    query: { enabled, staleTime: Number.POSITIVE_INFINITY, gcTime: Number.POSITIVE_INFINITY },
    contracts:
      enabled && underlying && asset
        ? [
            { address: underlying, abi: ERC20_ABI, functionName: "symbol" },
            { address: asset, abi: CONFIDENTIAL_ASSET_ABI, functionName: "symbol" },
          ]
        : [],
  });

  return {
    underlying: pick(data as never, 0, config.underlyingSymbol),
    confidential: pick(data as never, 1, config.symbol),
  };
}
