import { createPublicClient, http, type Address, type Hex } from "viem";
import { sepolia } from "viem/chains";

export const POOL_ADDRESS = (process.env.NEXT_PUBLIC_LANTERN_POOL ?? "") as Address;

const RPC_URL = process.env.SEPOLIA_RPC_URL || "https://ethereum-sepolia-rpc.publicnode.com";

export const POOL_ABI = [
  { type: "function", name: "jackpot", stateMutability: "view", inputs: [], outputs: [{ type: "uint64" }] },
  { type: "function", name: "prizePerDraw", stateMutability: "view", inputs: [], outputs: [{ type: "uint64" }] },
  { type: "function", name: "reserve", stateMutability: "view", inputs: [], outputs: [{ type: "uint64" }] },
  { type: "function", name: "drawId", stateMutability: "view", inputs: [], outputs: [{ type: "uint256" }] },
  { type: "function", name: "phase", stateMutability: "view", inputs: [], outputs: [{ type: "uint8" }] },
  { type: "function", name: "nextDrawAt", stateMutability: "view", inputs: [], outputs: [{ type: "uint256" }] },
  { type: "function", name: "depositorCount", stateMutability: "view", inputs: [], outputs: [{ type: "uint256" }] },
  {
    type: "function",
    name: "depositorAt",
    stateMutability: "view",
    inputs: [{ type: "uint256" }],
    outputs: [{ type: "address" }],
  },
  {
    type: "function",
    name: "confidentialBalanceOf",
    stateMutability: "view",
    inputs: [{ type: "address" }],
    outputs: [{ type: "bytes32" }],
  },
] as const;

export type PoolStats = {

  jackpot: number;

  reserve: number;

  draws: number;

  depositors: number;

  nextDrawAt: number;

  sealedHandle: Hex | null;

  sealedOwner: Address | null;
};

const client = createPublicClient({ chain: sepolia, transport: http(RPC_URL, { timeout: 8_000 }) });

const whole = (raw: bigint) => Number(raw / 1_000_000n);

export async function readPoolStats(): Promise<PoolStats | null> {
  if (!POOL_ADDRESS) return null;

  try {
    const contract = { address: POOL_ADDRESS, abi: POOL_ABI } as const;

    const [jackpot, prize, reserve, draws, nextDrawAt, depositorCount] = await client.multicall({
      allowFailure: false,
      contracts: [
        { ...contract, functionName: "jackpot" },
        { ...contract, functionName: "prizePerDraw" },
        { ...contract, functionName: "reserve" },
        { ...contract, functionName: "drawId" },
        { ...contract, functionName: "nextDrawAt" },
        { ...contract, functionName: "depositorCount" },
      ],
    });

    const people = depositorCount > 0n ? Number(depositorCount) - 1 : 0;

    const sealed = await readSealedHandle(depositorCount);

    return {

      jackpot: whole(jackpot > 0n ? jackpot : prize),
      reserve: whole(reserve),
      draws: Number(draws),
      depositors: people,
      nextDrawAt: Number(nextDrawAt),
      sealedHandle: sealed.handle,
      sealedOwner: sealed.owner,
    };
  } catch {
    return null;
  }
}

async function readSealedHandle(
  depositorCount: bigint,
): Promise<{ handle: Hex | null; owner: Address | null }> {
  if (depositorCount < 2n) return { handle: null, owner: null };

  try {
    const contract = { address: POOL_ADDRESS, abi: POOL_ABI } as const;
    const owner = await client.readContract({
      ...contract,
      functionName: "depositorAt",
      args: [depositorCount - 1n],
    });
    const handle = await client.readContract({
      ...contract,
      functionName: "confidentialBalanceOf",
      args: [owner],
    });

    if (/^0x0+$/.test(handle)) return { handle: null, owner: null };
    return { handle, owner };
  } catch {
    return { handle: null, owner: null };
  }
}
