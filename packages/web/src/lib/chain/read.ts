import "server-only";
import { createPublicClient, http, type Address, type Hex } from "viem";
import { sepolia } from "viem/chains";
import { HEARTH_POOL_ABI, HEARTH_SOURCE_ABI, HEARTH_VAULT_ABI } from "./abis";
import { HEARTH } from "./addresses";

/**
 * Server-side reads. The endpoint is deliberately not prefixed with NEXT_PUBLIC: the landing page
 * renders its numbers on the server and ships them inside the HTML, so the key never reaches a
 * browser. Log queries live here too, because the free public node caps eth_getLogs ranges far
 * below a day of blocks.
 */
const RPC_URL = process.env.SEPOLIA_RPC_URL || "https://ethereum-sepolia-rpc.publicnode.com";

export const serverClient = createPublicClient({
  chain: sepolia,
  transport: http(RPC_URL, { timeout: 10_000, batch: true }),
});

export type PoolStats = {
  period: number;
  periodEndsAt: number;
  periodLength: number;
  savers: number;
  scaleBits: number;
  /** Plaintext liquidity of each tier, in base units, grand tier first. */
  liquidity: [bigint, bigint, bigint];
  /** What each tier would pay per prize if a draw closed right now. */
  nextPrize: [bigint, bigint, bigint];
  prizeCount: [number, number, number];
  sponsorBalance: bigint;
  ratePerSecond: bigint;
  harvestable: bigint;
  vaultPaused: boolean;
  poolPaused: boolean;
  /** One real saver's encrypted principal, so the landing page can offer it to be broken open. */
  sealedHandle: Hex | null;
  sealedOwner: Address | null;
};

const UTILISATION_BPS = 5000n;

export async function readPoolStats(): Promise<PoolStats | null> {
  const { vault, pool, source } = HEARTH;
  if (!vault || !pool || !source) return null;

  try {
    const vaultAt = { address: vault, abi: HEARTH_VAULT_ABI } as const;
    const poolAt = { address: pool, abi: HEARTH_POOL_ABI } as const;
    const sourceAt = { address: source, abi: HEARTH_SOURCE_ABI } as const;

    const [period, periodLength, savers, scaleBits, vaultPaused, poolPaused, balance, rate, harvestable] =
      await serverClient.multicall({
        allowFailure: false,
        contracts: [
          { ...vaultAt, functionName: "currentPeriod" },
          { ...vaultAt, functionName: "periodLength" },
          { ...vaultAt, functionName: "saverCount" },
          { ...poolAt, functionName: "scaleBits" },
          { ...vaultAt, functionName: "paused" },
          { ...poolAt, functionName: "paused" },
          { ...sourceAt, functionName: "balance" },
          { ...sourceAt, functionName: "ratePerSecond" },
          { ...sourceAt, functionName: "harvestable" },
        ],
      });

    const [periodEndsAt, liquidity0, liquidity1, liquidity2, tier0, tier1, tier2] =
      await serverClient.multicall({
        allowFailure: false,
        contracts: [
          { ...vaultAt, functionName: "periodEnd", args: [period] },
          { ...poolAt, functionName: "liquidity", args: [0n] },
          { ...poolAt, functionName: "liquidity", args: [1n] },
          { ...poolAt, functionName: "liquidity", args: [2n] },
          { ...poolAt, functionName: "tierOf", args: [0] },
          { ...poolAt, functionName: "tierOf", args: [1] },
          { ...poolAt, functionName: "tierOf", args: [2] },
        ],
      });

    const liquidity: [bigint, bigint, bigint] = [liquidity0, liquidity1, liquidity2];
    const tiers = [tier0, tier1, tier2];
    const prizeCount = tiers.map((tier) => Number(tier.prizeCount)) as [number, number, number];
    const nextPrize = liquidity.map((available, index) =>
      prizeCount[index] === 0 ? 0n : (available * UTILISATION_BPS) / 10_000n / BigInt(prizeCount[index]),
    ) as [bigint, bigint, bigint];

    const sealed = await readSealedHandle(vault, savers);

    return {
      period: Number(period),
      periodEndsAt: Number(periodEndsAt),
      periodLength: Number(periodLength),
      savers: Number(savers),
      scaleBits: Number(scaleBits),
      liquidity,
      nextPrize,
      prizeCount,
      sponsorBalance: balance,
      ratePerSecond: rate,
      harvestable,
      vaultPaused,
      poolPaused,
      sealedHandle: sealed.handle,
      sealedOwner: sealed.owner,
    };
  } catch {
    // The pool lives on chain, not here. A node that will not answer costs the page its numbers
    // and nothing else, so the caller renders the honest "cannot reach Sepolia" state.
    return null;
  }
}

async function readSealedHandle(
  vault: Address,
  savers: bigint,
): Promise<{ handle: Hex | null; owner: Address | null }> {
  if (savers === 0n) return { handle: null, owner: null };
  try {
    const owner = await serverClient.readContract({
      address: vault,
      abi: HEARTH_VAULT_ABI,
      functionName: "saverAt",
      args: [savers - 1n],
    });
    const handle = await serverClient.readContract({
      address: vault,
      abi: HEARTH_VAULT_ABI,
      functionName: "confidentialBalanceOf",
      args: [owner],
    });
    if (/^0x0+$/.test(handle)) return { handle: null, owner: null };
    return { handle, owner };
  } catch {
    return { handle: null, owner: null };
  }
}
