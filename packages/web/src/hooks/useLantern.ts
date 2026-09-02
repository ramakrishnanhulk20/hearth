"use client";

import { useMemo } from "react";
import type { Address, Hex } from "viem";
import { useAccount, useReadContracts } from "wagmi";
import { ADDRESSES, CONFIDENTIAL_ABI, ERC20_ABI, POOL_ABI } from "@/lib/chain/contracts";

export type LanternReads = {

  jackpot: bigint;
  prizePerDraw: bigint;
  reserve: bigint;
  drawId: bigint;
  phase: number;
  nextDrawAt: number;
  drawInterval: bigint;
  depositors: number;
  scanCursor: bigint;
  scanEnd: bigint;
  maxChunk: bigint;

  hasDeposited: boolean;
  balanceHandle: Hex | null;
  winningsHandle: Hex | null;

  walletConfidentialHandle: Hex | null;

  walletTokens: bigint;
  allowance: bigint;
  refetch: () => void;
  isLoading: boolean;
};

const zeroHandle = (handle: unknown): Hex | null => {
  const value = handle as Hex | undefined;
  if (!value || /^0x0+$/.test(value)) return null;
  return value;
};

export function useLantern(): LanternReads {
  const { address } = useAccount();
  const me = (address ?? "0x0000000000000000000000000000000000000000") as Address;
  const connected = Boolean(address);

  const pool = { address: ADDRESSES.pool, abi: POOL_ABI } as const;
  const token = { address: ADDRESSES.testUsdc, abi: ERC20_ABI } as const;

  const { data, refetch, isLoading } = useReadContracts({

    query: { refetchInterval: 12_000 },
    contracts: [
      { ...pool, functionName: "jackpot" },
      { ...pool, functionName: "prizePerDraw" },
      { ...pool, functionName: "reserve" },
      { ...pool, functionName: "drawId" },
      { ...pool, functionName: "phase" },
      { ...pool, functionName: "nextDrawAt" },
      { ...pool, functionName: "drawInterval" },
      { ...pool, functionName: "depositorCount" },
      { ...pool, functionName: "scanCursor" },
      { ...pool, functionName: "scanEnd" },
      { ...pool, functionName: "maxChunk" },
      { ...pool, functionName: "hasDeposited", args: [me] },
      { ...pool, functionName: "confidentialBalanceOf", args: [me] },
      { ...pool, functionName: "confidentialWinningsOf", args: [me] },
      { ...token, functionName: "balanceOf", args: [me] },
      { ...token, functionName: "allowance", args: [me, ADDRESSES.confidentialUsdc] },
      {
        address: ADDRESSES.confidentialUsdc,
        abi: CONFIDENTIAL_ABI,
        functionName: "confidentialBalanceOf",
        args: [me],
      },
    ],
  });

  return useMemo(() => {
    const value = <T,>(index: number, fallback: T): T => {
      const entry = data?.[index];
      return entry && entry.status === "success" ? (entry.result as T) : fallback;
    };

    const rawDepositors = value<bigint>(7, 0n);
    const depositors = rawDepositors > 0n ? Number(rawDepositors) - 1 : 0;

    return {
      jackpot: value<bigint>(0, 0n),
      prizePerDraw: value<bigint>(1, 0n),
      reserve: value<bigint>(2, 0n),
      drawId: value<bigint>(3, 0n),
      phase: Number(value<bigint | number>(4, 0)),
      nextDrawAt: Number(value<bigint>(5, 0n)),
      drawInterval: value<bigint>(6, 0n),
      depositors,
      scanCursor: value<bigint>(8, 0n),
      scanEnd: value<bigint>(9, 0n),
      maxChunk: value<bigint>(10, 25n),
      hasDeposited: connected ? value<boolean>(11, false) : false,
      balanceHandle: connected ? zeroHandle(value<Hex>(12, "0x")) : null,
      winningsHandle: connected ? zeroHandle(value<Hex>(13, "0x")) : null,
      walletTokens: connected ? value<bigint>(14, 0n) : 0n,
      allowance: connected ? value<bigint>(15, 0n) : 0n,
      walletConfidentialHandle: connected ? zeroHandle(value<Hex>(16, "0x")) : null,
      refetch,
      isLoading,
    };
  }, [data, connected, refetch, isLoading]);
}

export const CONFIDENTIAL_USDC = ADDRESSES.confidentialUsdc;
export { CONFIDENTIAL_ABI };
