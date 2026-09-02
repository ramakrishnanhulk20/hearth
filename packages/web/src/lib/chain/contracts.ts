import type { Address } from "viem";

export const CHAIN_ID = Number(process.env.NEXT_PUBLIC_CHAIN_ID ?? 11155111);

export const ADDRESSES = {
  pool: (process.env.NEXT_PUBLIC_LANTERN_POOL ?? "") as Address,
  confidentialUsdc: (process.env.NEXT_PUBLIC_CONFIDENTIAL_USDC ?? "") as Address,
  testUsdc: (process.env.NEXT_PUBLIC_TEST_USDC ?? "") as Address,
} as const;

export const POOL_ABI = [
  { type: "function", name: "jackpot", stateMutability: "view", inputs: [], outputs: [{ type: "uint64" }] },
  { type: "function", name: "prizePerDraw", stateMutability: "view", inputs: [], outputs: [{ type: "uint64" }] },
  { type: "function", name: "reserve", stateMutability: "view", inputs: [], outputs: [{ type: "uint64" }] },
  { type: "function", name: "drawId", stateMutability: "view", inputs: [], outputs: [{ type: "uint256" }] },
  { type: "function", name: "phase", stateMutability: "view", inputs: [], outputs: [{ type: "uint8" }] },
  { type: "function", name: "drawInterval", stateMutability: "view", inputs: [], outputs: [{ type: "uint64" }] },
  { type: "function", name: "nextDrawAt", stateMutability: "view", inputs: [], outputs: [{ type: "uint256" }] },
  { type: "function", name: "lastDrawAt", stateMutability: "view", inputs: [], outputs: [{ type: "uint256" }] },
  { type: "function", name: "scanCursor", stateMutability: "view", inputs: [], outputs: [{ type: "uint256" }] },
  { type: "function", name: "scanEnd", stateMutability: "view", inputs: [], outputs: [{ type: "uint256" }] },
  { type: "function", name: "maxChunk", stateMutability: "view", inputs: [], outputs: [{ type: "uint256" }] },
  {
    type: "function",
    name: "scanTransactionsRemaining",
    stateMutability: "view",
    inputs: [],
    outputs: [{ type: "uint256" }],
  },
  { type: "function", name: "depositorCount", stateMutability: "view", inputs: [], outputs: [{ type: "uint256" }] },
  { type: "function", name: "hasDeposited", stateMutability: "view", inputs: [{ type: "address" }], outputs: [{ type: "bool" }] },
  {
    type: "function",
    name: "confidentialBalanceOf",
    stateMutability: "view",
    inputs: [{ type: "address" }],
    outputs: [{ type: "bytes32" }],
  },
  {
    type: "function",
    name: "confidentialWinningsOf",
    stateMutability: "view",
    inputs: [{ type: "address" }],
    outputs: [{ type: "bytes32" }],
  },
  {
    type: "function",
    name: "withdraw",
    stateMutability: "nonpayable",
    inputs: [{ type: "bytes32" }, { type: "bytes" }],
    outputs: [],
  },
  { type: "function", name: "claim", stateMutability: "nonpayable", inputs: [], outputs: [] },
  { type: "function", name: "openDraw", stateMutability: "nonpayable", inputs: [], outputs: [] },
  { type: "function", name: "scanChunk", stateMutability: "nonpayable", inputs: [{ type: "uint256" }], outputs: [] },
  {
    type: "function",
    name: "fundReserve",
    stateMutability: "nonpayable",
    inputs: [{ type: "uint64" }],
    outputs: [],
  },
  { type: "event", name: "Deposited", inputs: [{ type: "address", name: "depositor", indexed: true }] },
  { type: "event", name: "Withdrawn", inputs: [{ type: "address", name: "depositor", indexed: true }] },
  { type: "event", name: "DrawOpened", inputs: [{ type: "uint256", name: "draw", indexed: true }, { type: "uint64", name: "prize" }, { type: "uint256", name: "participants" }] },
  { type: "event", name: "DrawSettled", inputs: [{ type: "uint256", name: "draw", indexed: true }] },
] as const;

export const ERC20_ABI = [
  { type: "function", name: "name", stateMutability: "view", inputs: [], outputs: [{ type: "string" }] },
  { type: "function", name: "symbol", stateMutability: "view", inputs: [], outputs: [{ type: "string" }] },
  { type: "function", name: "decimals", stateMutability: "view", inputs: [], outputs: [{ type: "uint8" }] },
  {
    type: "function",
    name: "balanceOf",
    stateMutability: "view",
    inputs: [{ type: "address" }],
    outputs: [{ type: "uint256" }],
  },
  {
    type: "function",
    name: "allowance",
    stateMutability: "view",
    inputs: [{ type: "address" }, { type: "address" }],
    outputs: [{ type: "uint256" }],
  },
  {
    type: "function",
    name: "approve",
    stateMutability: "nonpayable",
    inputs: [{ type: "address" }, { type: "uint256" }],
    outputs: [{ type: "bool" }],
  },
  {
    type: "function",
    name: "mint",
    stateMutability: "nonpayable",
    inputs: [{ type: "address" }, { type: "uint256" }],
    outputs: [],
  },
] as const;

export const CONFIDENTIAL_ABI = [
  {
    type: "function",
    name: "wrap",
    stateMutability: "nonpayable",
    inputs: [{ type: "address" }, { type: "uint256" }],
    outputs: [{ type: "bytes32" }],
  },
  {
    type: "function",
    name: "confidentialBalanceOf",
    stateMutability: "view",
    inputs: [{ type: "address" }],
    outputs: [{ type: "bytes32" }],
  },
  {
    type: "function",
    name: "confidentialTransferAndCall",
    stateMutability: "nonpayable",
    inputs: [
      { type: "address", name: "to" },
      { type: "bytes32", name: "encryptedAmount" },
      { type: "bytes", name: "inputProof" },
      { type: "bytes", name: "data" },
    ],
    outputs: [{ type: "bytes32" }],
  },
] as const;

export const TOKEN_DECIMALS = 6;
export const TOKEN_UNIT = 1_000_000n;
