"use client";

import { useEffect, useMemo, useState, useSyncExternalStore } from "react";
import type { Address, Hex } from "viem";
import { useAccount, useBalance, useReadContracts } from "wagmi";
import { HEARTH_POOL_ABI, HEARTH_SOURCE_ABI, HEARTH_VAULT_ABI, CONFIDENTIAL_ASSET_ABI } from "@/lib/chain/abis";
import { CHAIN_ID, MIN_ANONYMITY_SET } from "@/lib/chain/addresses";
import { faucetAmount, underlyingDecimals, type Pool } from "@/lib/chain/pools";
import { useCurrentPool } from "@/components/app/PoolProvider";
import { useHydrated } from "./useHydrated";
import { ERC20_ABI, REVIEWED_IMPLEMENTATION, TOKEN_GOVERNANCE_ABI } from "@/lib/chain/tokenAbi";
import type { Activity } from "@/app/api/activity/route";

const NOBODY = "0x0000000000000000000000000000000000000000" as Address;

type Entry = { status: "success"; result: unknown } | { status: "failure"; error: unknown };

function value<T>(data: readonly Entry[] | undefined, index: number, fallback: T): T {
  const entry = data?.[index];
  return entry && entry.status === "success" ? (entry.result as T) : fallback;
}

/**
 * Whether one call in a multicall actually answered. A batch can come back with some entries
 * failed, so a screen that only watches the batch's isLoading would print a fallback as a fact.
 */
function landed(data: readonly Entry[] | undefined, index: number): boolean {
  return data?.[index]?.status === "success";
}

function handle(raw: unknown): Hex | null {
  const asHex = raw as Hex | undefined;
  if (!asHex || /^0x0*$/.test(asHex)) return null;
  return asHex;
}

/** Everything about the pool on screen that never changes, so it is read once and cached hard. */
export type HearthConfig = {
  slug: string;
  /** The confidential token's name and ticker, and the plain token underneath it. */
  name: string;
  symbol: string;
  underlyingSymbol: string;
  /** The scale every vault figure, prize and credit on this pool is counted in. */
  decimals: number;
  /**
   * The scale the plain ERC-20 uses, worked out from the wrapper's rate rather than stored. The
   * two differ wherever the underlying carries more decimals than the confidential token, which
   * is every wrapper over an 18-decimal token.
   */
  underlyingDecimals: number;
  /** True for a token Hearth cannot open a pool on. Every address below it is null. */
  restricted: boolean;
  /** Why the token is refused, in words a saver can act on. */
  reason: string | null;
  vault: Address | null;
  pool: Address | null;
  source: Address | null;
  asset: Address | null;
  underlying: Address | null;
  periodLength: number;
  firstPeriodAt: number;
  maxPrincipal: bigint;
  /** Underlying units per confidential unit. One wherever both sides use the same decimals. */
  rate: bigint;
  /** What the faucet asks the mock underlying for: its per-call cap of a million whole tokens. */
  faucet: bigint;
  maxBatch: bigint;
  ready: boolean;
};

export function useHearthConfig(): HearthConfig {
  const entry: Pool = useCurrentPool();
  const open = entry.status === "open" ? entry : null;
  const vault = open?.vault ?? null;

  const { data } = useReadContracts({
    query: { enabled: vault !== null, staleTime: Number.POSITIVE_INFINITY, gcTime: Number.POSITIVE_INFINITY },
    contracts: vault
      ? [
          { address: vault, abi: HEARTH_VAULT_ABI, functionName: "asset" },
          { address: vault, abi: HEARTH_VAULT_ABI, functionName: "periodLength" },
          { address: vault, abi: HEARTH_VAULT_ABI, functionName: "firstPeriodAt" },
          { address: vault, abi: HEARTH_VAULT_ABI, functionName: "maxPrincipal" },
          { address: vault, abi: HEARTH_VAULT_ABI, functionName: "MAX_BATCH" },
        ]
      : [],
  });

  // The deployment file says which token this pool is on, and the vault is asked anyway. A pool
  // that answered with a different asset would be one the file has gone stale on, and the chain
  // is the one of the two that cannot be stale.
  const asset = value<Address | undefined>(data as never, 0, undefined) ?? open?.asset ?? null;

  const { data: assetData } = useReadContracts({
    query: { enabled: asset !== null, staleTime: Number.POSITIVE_INFINITY, gcTime: Number.POSITIVE_INFINITY },
    contracts: asset
      ? [
          { address: asset, abi: CONFIDENTIAL_ASSET_ABI, functionName: "underlying" },
          { address: asset, abi: CONFIDENTIAL_ASSET_ABI, functionName: "rate" },
        ]
      : [],
  });

  const underlying = value<Address | undefined>(assetData as never, 0, undefined) ?? open?.underlying ?? null;

  return useMemo(() => {
    const decimals = open?.decimals ?? 6;
    const rate = value<bigint>(assetData as never, 1, 1n);

    return {
      slug: entry.slug,
      name: entry.name,
      symbol: entry.symbol,
      underlyingSymbol: entry.underlyingSymbol,
      decimals,
      underlyingDecimals: underlyingDecimals(decimals, rate),
      restricted: entry.status === "restricted",
      reason: entry.status === "restricted" ? entry.reason : null,
      vault,
      pool: open?.pool ?? null,
      source: open?.source ?? null,
      asset,
      underlying,
      periodLength: Number(value<bigint>(data as never, 1, BigInt(open?.periodLength ?? 3600))),
      firstPeriodAt: Number(value<bigint>(data as never, 2, BigInt(open?.firstPeriodAt ?? 0))),
      maxPrincipal: value<bigint>(data as never, 3, 0n),
      rate,
      faucet: faucetAmount(decimals, rate),
      maxBatch: value<bigint>(data as never, 4, 4n),
      ready: vault !== null && asset !== null && underlying !== null,
    };
  }, [entry, open, vault, asset, underlying, data, assetData]);
}

export type Tier = {
  /** False until this tier's `tierOf` read lands, which leaves the five fields under it unknown. */
  known: boolean;
  prizeCount: number;
  oddsNumerator: bigint;
  oddsDenominator: bigint;
  shares: number;
  reconcileEvery: number;
  /** Null until this tier's `liquidity` read lands. */
  liquidity: bigint | null;
  /** What one prize in this tier would be worth if a draw closed right now, null until both land. */
  nextPrize: bigint | null;
  carryPending: boolean;
  carryPublishedAt: number;
};

/** Which pool reads answered. A false here means the field beside it is a fallback, not a fact. */
export type PoolKnown = {
  period: boolean;
  savers: boolean;
  scaleBits: boolean;
  lastClosedDraw: boolean;
  closableDraw: boolean;
  sponsorBalance: boolean;
  ratePerSecond: boolean;
  harvestable: boolean;
};

export type PoolState = {
  period: number;
  periodEndsAt: number;
  savers: number;
  scaleBits: number;
  lastClosedDraw: number;
  closableDraw: number;
  closeDeadline: number;
  vaultPaused: boolean;
  poolPaused: boolean;
  tiers: Tier[];
  sponsorBalance: bigint;
  ratePerSecond: bigint;
  harvestable: bigint;
  /** Null while any tier's liquidity is unread, since a partial sum is not the pool's liquidity. */
  totalLiquidity: bigint | null;
  /** True while the published bracket is close to personal information. */
  thinAnonymitySet: boolean;
  known: PoolKnown;
  isLoading: boolean;
  /** Nothing on screen came from the chain: the batch is not in flight and it returned nothing. */
  unavailable: boolean;
  isError: boolean;
  refetch: () => void;
};

const UTILISATION_BPS = 5000n;

export function usePoolState(): PoolState {
  const entry = useCurrentPool();
  const open = entry.status === "open" ? entry : null;
  const vault = open?.vault ?? null;
  const pool = open?.pool ?? null;
  const source = open?.source ?? null;
  const enabled = vault !== null && pool !== null && source !== null;

  const hydrated = useHydrated();
  const { data: liveData, refetch, isLoading, isError } = useReadContracts({
    query: { enabled, refetchInterval: 12_000 },
    contracts: enabled
      ? [
          { address: vault, abi: HEARTH_VAULT_ABI, functionName: "currentPeriod" },
          { address: vault, abi: HEARTH_VAULT_ABI, functionName: "saverCount" },
          { address: vault, abi: HEARTH_VAULT_ABI, functionName: "paused" },
          { address: pool, abi: HEARTH_POOL_ABI, functionName: "paused" },
          { address: pool, abi: HEARTH_POOL_ABI, functionName: "scaleBits" },
          { address: pool, abi: HEARTH_POOL_ABI, functionName: "lastClosedDraw" },
          { address: pool, abi: HEARTH_POOL_ABI, functionName: "closableDraw" },
          { address: pool, abi: HEARTH_POOL_ABI, functionName: "liquidity", args: [0n] },
          { address: pool, abi: HEARTH_POOL_ABI, functionName: "liquidity", args: [1n] },
          { address: pool, abi: HEARTH_POOL_ABI, functionName: "liquidity", args: [2n] },
          { address: pool, abi: HEARTH_POOL_ABI, functionName: "tierOf", args: [0] },
          { address: pool, abi: HEARTH_POOL_ABI, functionName: "tierOf", args: [1] },
          { address: pool, abi: HEARTH_POOL_ABI, functionName: "tierOf", args: [2] },
          { address: vault, abi: HEARTH_VAULT_ABI, functionName: "publishedCarry", args: [0] },
          { address: vault, abi: HEARTH_VAULT_ABI, functionName: "publishedCarry", args: [1] },
          { address: vault, abi: HEARTH_VAULT_ABI, functionName: "publishedCarry", args: [2] },
          { address: source, abi: HEARTH_SOURCE_ABI, functionName: "balance" },
          { address: source, abi: HEARTH_SOURCE_ABI, functionName: "ratePerSecond" },
          { address: source, abi: HEARTH_SOURCE_ABI, functionName: "harvestable" },
        ]
      : [],
  });

  // wagmi can answer from cache before React finishes hydrating, and the server had no
  // answer at all, so the first client render has to look like the server's.
  const data = hydrated ? liveData : undefined;

  const period = Number(value<number>(data as never, 0, 0));
  const closable = Number(value<number>(data as never, 6, 0));

  const { data: timing } = useReadContracts({
    query: { enabled: enabled && period > 0, refetchInterval: 12_000 },
    contracts:
      enabled && period > 0
        ? [
            { address: vault, abi: HEARTH_VAULT_ABI, functionName: "periodEnd", args: [period] },
            { address: pool, abi: HEARTH_POOL_ABI, functionName: "closeDeadline", args: [closable] },
          ]
        : [],
  });

  return useMemo(() => {
    type RawTier = { prizeCount: number; oddsNumerator: bigint; oddsDenominator: bigint; shares: number; reconcileEvery: number };

    const tiers: Tier[] = [0, 1, 2].map((index) => {
      const raw = value<RawTier | undefined>(data as never, 10 + index, undefined);
      const liquidity = landed(data as never, 7 + index) ? value<bigint>(data as never, 7 + index, 0n) : null;
      const carry = value<readonly [Hex, number, boolean]>(data as never, 13 + index, ["0x0" as Hex, 0, false]);
      const count = raw && raw.prizeCount > 0 ? BigInt(raw.prizeCount) : null;
      return {
        known: raw !== undefined,
        prizeCount: Number(raw?.prizeCount ?? 0),
        oddsNumerator: raw?.oddsNumerator ?? 0n,
        oddsDenominator: raw?.oddsDenominator ?? 0n,
        shares: Number(raw?.shares ?? 0),
        reconcileEvery: Number(raw?.reconcileEvery ?? 0),
        liquidity,
        nextPrize: liquidity !== null && count !== null ? (liquidity * UTILISATION_BPS) / 10_000n / count : null,
        carryPublishedAt: Number(carry[1]),
        carryPending: Boolean(carry[2]),
      };
    });

    const savers = Number(value<bigint>(data as never, 1, 0n));
    const liquidities = tiers.map((tier) => tier.liquidity);

    return {
      period,
      periodEndsAt: Number(value<bigint>(timing as never, 0, 0n)),
      savers,
      scaleBits: Number(value<number>(data as never, 4, 0)),
      lastClosedDraw: Number(value<number>(data as never, 5, 0)),
      closableDraw: closable,
      closeDeadline: Number(value<bigint>(timing as never, 1, 0n)),
      vaultPaused: value<boolean>(data as never, 2, false),
      poolPaused: value<boolean>(data as never, 3, false),
      tiers,
      sponsorBalance: value<bigint>(data as never, 16, 0n),
      ratePerSecond: value<bigint>(data as never, 17, 0n),
      harvestable: value<bigint>(data as never, 18, 0n),
      totalLiquidity: liquidities.every((amount) => amount !== null)
        ? liquidities.reduce((total: bigint, amount) => total + (amount as bigint), 0n)
        : null,
      thinAnonymitySet: savers > 0 && savers < MIN_ANONYMITY_SET,
      known: {
        period: landed(data as never, 0),
        savers: landed(data as never, 1),
        scaleBits: landed(data as never, 4),
        lastClosedDraw: landed(data as never, 5),
        closableDraw: landed(data as never, 6),
        sponsorBalance: landed(data as never, 16),
        ratePerSecond: landed(data as never, 17),
        harvestable: landed(data as never, 18),
      },
      isLoading,
      unavailable: hydrated && !isLoading && data === undefined,
      isError,
      refetch: () => void refetch(),
    };
  }, [data, timing, period, closable, isLoading, isError, refetch, hydrated]);
}

export type SaverState = {
  address: Address | null;
  connected: boolean;
  wrongNetwork: boolean;
  ethBalance: bigint;
  /** The plain ERC-20 sitting in the wallet, in the underlying's own decimals. */
  underlyingBalance: bigint;
  /** What the wrapper is allowed to take of it, in the same decimals. */
  allowance: bigint;
  confidentialHandle: Hex | null;
  isSaver: boolean;
  principalHandle: Hex | null;
  winningsHandle: Hex | null;
  firstObservationAt: number;
  isLoading: boolean;
  /** Nothing on screen came from the chain: the batch is not in flight and it returned nothing. */
  unavailable: boolean;
  isError: boolean;
  refetch: () => void;
};

export function useSaverState(config: HearthConfig): SaverState {
  const { address, isConnected, chainId } = useAccount();
  const me = (address ?? NOBODY) as Address;
  const connected = Boolean(address);
  const { data: eth } = useBalance({ address, query: { enabled: connected, refetchInterval: 15_000 } });

  const enabled = connected && config.vault !== null && config.asset !== null && config.underlying !== null;

  const hydrated = useHydrated();
  const { data: liveData, refetch, isLoading, isError } = useReadContracts({
    query: { enabled, refetchInterval: 12_000 },
    contracts:
      enabled && config.vault && config.asset && config.underlying
        ? [
            { address: config.underlying, abi: ERC20_ABI, functionName: "balanceOf", args: [me] },
            { address: config.underlying, abi: ERC20_ABI, functionName: "allowance", args: [me, config.asset] },
            { address: config.asset, abi: CONFIDENTIAL_ASSET_ABI, functionName: "confidentialBalanceOf", args: [me] },
            { address: config.vault, abi: HEARTH_VAULT_ABI, functionName: "isSaver", args: [me] },
            { address: config.vault, abi: HEARTH_VAULT_ABI, functionName: "confidentialBalanceOf", args: [me] },
            { address: config.vault, abi: HEARTH_VAULT_ABI, functionName: "confidentialWinningsOf", args: [me] },
            { address: config.vault, abi: HEARTH_VAULT_ABI, functionName: "firstObservationAt", args: [me] },
          ]
        : [],
  });

  // wagmi can answer from cache before React finishes hydrating, and the server had no
  // answer at all, so the first client render has to look like the server's.
  const data = hydrated ? liveData : undefined;

  return useMemo(
    () => ({
      address: address ?? null,
      connected,
      wrongNetwork: isConnected && chainId !== CHAIN_ID,
      ethBalance: eth?.value ?? 0n,
      underlyingBalance: value<bigint>(data as never, 0, 0n),
      allowance: value<bigint>(data as never, 1, 0n),
      confidentialHandle: handle(value<unknown>(data as never, 2, null)),
      isSaver: value<boolean>(data as never, 3, false),
      principalHandle: handle(value<unknown>(data as never, 4, null)),
      winningsHandle: handle(value<unknown>(data as never, 5, null)),
      firstObservationAt: Number(value<number>(data as never, 6, 0)),
      isLoading,
      unavailable: hydrated && connected && !isLoading && data === undefined,
      isError,
      refetch: () => void refetch(),
    }),
    [address, connected, isConnected, chainId, eth, data, isLoading, isError, refetch, hydrated],
  );
}

export const DRAW_STATUS = ["none", "closed", "awarded", "empty", "skipped"] as const;
export type DrawStatus = (typeof DRAW_STATUS)[number];

export type DrawView = {
  drawId: number;
  /** False until this draw's `drawOf` read lands. Every field below it is a fallback until then. */
  known: boolean;
  status: DrawStatus;
  seed: bigint;
  scaleBits: number;
  harvested: bigint;
  prize: [bigint, bigint, bigint];
  offered: [bigint, bigint, bigint];
  seedHandle: Hex;
  scaleHandle: Hex;
  nonEmptyHandle: Hex;
  harvestHandle: Hex;
  opened: boolean;
  finalized: boolean;
  walkStart: number;
  walkCount: number;
  cursor: number;
  evaluatedCount: number;
  periodEndsAt: number;
  windowEndsAt: number;
  closeDeadline: number;
  /** This wallet's place in the draw, all four of these null when no wallet is connected. */
  mine: {
    evaluated: boolean;
    weightHandle: Hex | null;
    creditHandle: Hex | null;
  } | null;
};

/** How many finished periods the app keeps on screen. Two are in a window, the rest is history. */
export const RECENT_DRAWS = 4;

export type DrawsState = {
  draws: DrawView[];
  isLoading: boolean;
  /** No draw read answered: the batch is not in flight and it returned nothing. */
  unavailable: boolean;
  isError: boolean;
  refetch: () => void;
};

export function useDraws(period: number): DrawsState {
  const entry = useCurrentPool();
  const open = entry.status === "open" ? entry : null;
  const vault = open?.vault ?? null;
  const pool = open?.pool ?? null;
  const { address } = useAccount();
  const me = (address ?? NOBODY) as Address;

  const ids = useMemo(() => {
    const newest = period - 1;
    const list: number[] = [];
    for (let id = newest; id >= Math.max(1, newest - RECENT_DRAWS + 1); id--) list.push(id);
    return list;
  }, [period]);

  const enabled = vault !== null && pool !== null && ids.length > 0;

  const hydrated = useHydrated();
  const { data: liveData, refetch, isLoading, isError } = useReadContracts({
    query: { enabled, refetchInterval: 12_000 },
    contracts:
      enabled && vault && pool
        ? ids.flatMap((id) => [
            { address: pool, abi: HEARTH_POOL_ABI, functionName: "drawOf", args: [id] } as const,
            { address: vault, abi: HEARTH_VAULT_ABI, functionName: "opened", args: [id] } as const,
            { address: vault, abi: HEARTH_VAULT_ABI, functionName: "finalized", args: [id] } as const,
            { address: vault, abi: HEARTH_VAULT_ABI, functionName: "walkOf", args: [id] } as const,
            { address: vault, abi: HEARTH_VAULT_ABI, functionName: "cursorOf", args: [id] } as const,
            { address: vault, abi: HEARTH_VAULT_ABI, functionName: "evaluatedCount", args: [id] } as const,
            { address: vault, abi: HEARTH_VAULT_ABI, functionName: "periodEnd", args: [id] } as const,
            { address: vault, abi: HEARTH_VAULT_ABI, functionName: "windowEndsAt", args: [id] } as const,
            { address: pool, abi: HEARTH_POOL_ABI, functionName: "closeDeadline", args: [id] } as const,
            { address: vault, abi: HEARTH_VAULT_ABI, functionName: "evaluated", args: [id, me] } as const,
            { address: vault, abi: HEARTH_VAULT_ABI, functionName: "weightHandle", args: [id, me] } as const,
            { address: vault, abi: HEARTH_VAULT_ABI, functionName: "creditHandle", args: [id, me] } as const,
          ])
        : [],
  });

  // wagmi can answer from cache before React finishes hydrating, and the server had no
  // answer at all, so the first client render has to look like the server's.
  const data = hydrated ? liveData : undefined;

  const draws = useMemo(() => {
    type RawDraw = {
      status: number;
      seedHandle: Hex;
      scaleHandle: Hex;
      nonEmptyHandle: Hex;
      harvestHandle: Hex;
      seed: bigint;
      scaleBits: number;
      harvested: bigint;
      prize: readonly [bigint, bigint, bigint];
      offered: readonly [bigint, bigint, bigint];
    };

    return ids.map((drawId, slot): DrawView => {
      const base = slot * 12;
      const raw = value<RawDraw | undefined>(data as never, base, undefined);
      const walk = value<readonly [number, number]>(data as never, base + 3, [0, 0]);
      return {
        drawId,
        known: raw !== undefined,
        status: DRAW_STATUS[Number(raw?.status ?? 0)] ?? "none",
        seed: raw?.seed ?? 0n,
        scaleBits: Number(raw?.scaleBits ?? 0),
        harvested: raw?.harvested ?? 0n,
        prize: [raw?.prize?.[0] ?? 0n, raw?.prize?.[1] ?? 0n, raw?.prize?.[2] ?? 0n],
        offered: [raw?.offered?.[0] ?? 0n, raw?.offered?.[1] ?? 0n, raw?.offered?.[2] ?? 0n],
        seedHandle: (raw?.seedHandle ?? "0x") as Hex,
        scaleHandle: (raw?.scaleHandle ?? "0x") as Hex,
        nonEmptyHandle: (raw?.nonEmptyHandle ?? "0x") as Hex,
        harvestHandle: (raw?.harvestHandle ?? "0x") as Hex,
        opened: value<boolean>(data as never, base + 1, false),
        finalized: value<boolean>(data as never, base + 2, false),
        walkStart: Number(walk[0]),
        walkCount: Number(walk[1]),
        cursor: Number(value<number>(data as never, base + 4, 0)),
        evaluatedCount: Number(value<number>(data as never, base + 5, 0)),
        periodEndsAt: Number(value<bigint>(data as never, base + 6, 0n)),
        windowEndsAt: Number(value<bigint>(data as never, base + 7, 0n)),
        closeDeadline: Number(value<bigint>(data as never, base + 8, 0n)),
        mine: address
          ? {
              evaluated: value<boolean>(data as never, base + 9, false),
              weightHandle: handle(value<unknown>(data as never, base + 10, null)),
              creditHandle: handle(value<unknown>(data as never, base + 11, null)),
            }
          : null,
      };
    });
  }, [ids, data, address]);

  return {
    draws,
    isLoading,
    unavailable: hydrated && enabled && !isLoading && data === undefined,
    isError,
    refetch: () => void refetch(),
  };
}

export type TokenLayer = {
  observerCount: number;
  observers: readonly Address[];
  paused: boolean;
  blocked: boolean;
  /** Null while the read is in flight or the node refuses the storage read. */
  implementation: string | null;
  upgraded: boolean;
  /**
   * True once the token's own reads have finished and answered with nothing. Every field above is
   * a fallback in that state, and the privacy banners are drawn from those fields, so a screen
   * that ignored this would quietly say "no observers, not paused" about a token it never read.
   */
  unread: boolean;
};

/**
 * The confidential token is Zama's, not ours, and it is upgradeable with an observer list whose
 * members can decrypt every handle the token holds rights on. Reading the current state beats
 * watching for the events that set it, because state is true whatever block range is in view.
 */
export function useTokenLayer(config: HearthConfig): TokenLayer {
  const { address } = useAccount();
  const me = (address ?? NOBODY) as Address;
  const asset = config.asset;

  const hydrated = useHydrated();
  const { data: liveData, isLoading } = useReadContracts({
    query: { enabled: asset !== null, refetchInterval: 60_000 },
    contracts: asset
      ? [
          { address: asset, abi: TOKEN_GOVERNANCE_ABI, functionName: "observerCount" },
          { address: asset, abi: TOKEN_GOVERNANCE_ABI, functionName: "observers" },
          { address: asset, abi: TOKEN_GOVERNANCE_ABI, functionName: "paused" },
          { address: asset, abi: TOKEN_GOVERNANCE_ABI, functionName: "isBlocked", args: [me] },
        ]
      : [],
  });

  // Same reason as the pool and saver batches: wagmi can answer from cache before React finishes
  // hydrating, and the server had no answer at all.
  const data = hydrated ? liveData : undefined;

  const [implementation, setImplementation] = useState<string | null>(null);
  useEffect(() => {
    if (!asset) return;
    let cancelled = false;
    (async () => {
      const { createPublicClient, http } = await import("viem");
      const { sepolia } = await import("viem/chains");
      const { IMPLEMENTATION_SLOT } = await import("@/lib/chain/tokenAbi");
      const client = createPublicClient({
        chain: sepolia,
        transport: http(process.env.NEXT_PUBLIC_SEPOLIA_RPC_URL || undefined),
      });
      try {
        const slot = await client.getStorageAt({ address: asset, slot: IMPLEMENTATION_SLOT });
        if (!cancelled && slot) setImplementation(`0x${slot.slice(-40)}`.toLowerCase());
      } catch {
        // A node that will not answer a storage read costs the banner, not the app.
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [asset]);

  return useMemo(() => {
    const count = Number(value<bigint>(data as never, 0, 0n));
    return {
      observerCount: count,
      observers: value<readonly Address[]>(data as never, 1, []),
      paused: value<boolean>(data as never, 2, false),
      blocked: value<boolean>(data as never, 3, false),
      implementation,
      upgraded: implementation !== null && implementation !== REVIEWED_IMPLEMENTATION,
      unread: hydrated && asset !== null && !isLoading && data === undefined,
    };
  }, [data, implementation, hydrated, asset, isLoading]);
}

/** The draw history for the pool on screen. The route reads the chain; this asks the route. */
export function useActivity(): { activity: Activity | null; error: string | null } {
  const { slug, status } = useCurrentPool();
  const [activity, setActivity] = useState<Activity | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // A token with no pool has no draws, so asking would only produce a refusal to report.
    if (status !== "open") return;

    let cancelled = false;
    const load = async () => {
      try {
        const response = await fetch(`/api/activity?pool=${encodeURIComponent(slug)}`, { cache: "no-store" });
        const body = await response.json();
        if (cancelled) return;
        if (!response.ok) {
          setError(typeof body?.error === "string" ? body.error : "Could not read the draw history.");
          return;
        }
        setError(null);
        setActivity(body as Activity);
      } catch {
        if (!cancelled) setError("Could not reach this app's own server to read the draw history.");
      }
    };
    // A tab nobody is looking at has nothing to update, and this poll reaches our own server,
    // which reaches an archive node. It stops while the tab is hidden and catches up the moment
    // it comes back, so what a reader sees on their return is fresh rather than half an hour old.
    const tick = () => {
      if (document.hidden) return;
      void load();
    };
    const onVisible = () => {
      if (!document.hidden) void load();
    };

    void load();
    const timer = setInterval(tick, 30_000);
    document.addEventListener("visibilitychange", onVisible);
    return () => {
      cancelled = true;
      clearInterval(timer);
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, [slug, status]);

  return { activity, error };
}

let clockSeconds = 0;
const clockListeners = new Set<() => void>();
let clockTimer: ReturnType<typeof setInterval> | null = null;

function subscribeToClock(listener: () => void): () => void {
  clockListeners.add(listener);
  if (clockTimer === null) {
    clockSeconds = Math.floor(Date.now() / 1000);
    clockTimer = setInterval(() => {
      clockSeconds = Math.floor(Date.now() / 1000);
      for (const each of clockListeners) each();
    }, 1000);
  }
  listener();
  return () => {
    clockListeners.delete(listener);
    if (clockListeners.size === 0 && clockTimer !== null) {
      clearInterval(clockTimer);
      clockTimer = null;
    }
  };
}

const clockOnClient = (): number => clockSeconds;
const clockOnServer = (): number => 0;

/**
 * One clock for every countdown on the page, and zero until the browser has started it.
 *
 * Seeding from Date.now() during render read the server's clock and then the browser's, which are
 * never the same second, so every countdown rendered one string on the server and a different one
 * on the client and React reported the mismatch. The server cannot know the viewer's clock, so it
 * says so with a zero and `countdown` renders a placeholder for that one frame.
 */
export function useNow(): number {
  return useSyncExternalStore(subscribeToClock, clockOnClient, clockOnServer);
}
