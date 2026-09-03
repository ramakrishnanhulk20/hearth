/**
 * The two ABIs no artifact in this repo can supply.
 *
 * ERC20_ABI is the public underlying. `mint` is on Zama's USDCMock and has no owner check; a
 * production USDC has no such function, which is why it is grouped here rather than treated as
 * standard.
 *
 * TOKEN_GOVERNANCE_ABI is what Zama's cUSDCMock adds on top of the OpenZeppelin wrapper: an
 * observer list whose members can user-decrypt every handle the token holds rights on, a pause,
 * and a deny list. Reading the current state is stronger than watching for the events that set
 * it, because state is true whatever block range the app happens to look at. Verified against the
 * deployed proxy on 2 September 2026 (reference/audit/sepolia-cusdc-mock.md).
 */

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

export const TOKEN_GOVERNANCE_ABI = [
  { type: "function", name: "observerCount", stateMutability: "view", inputs: [], outputs: [{ type: "uint256" }] },
  { type: "function", name: "observers", stateMutability: "view", inputs: [], outputs: [{ type: "address[]" }] },
  { type: "function", name: "paused", stateMutability: "view", inputs: [], outputs: [{ type: "bool" }] },
  { type: "function", name: "pauser", stateMutability: "view", inputs: [], outputs: [{ type: "address" }] },
  { type: "function", name: "owner", stateMutability: "view", inputs: [], outputs: [{ type: "address" }] },
  {
    type: "function",
    name: "isBlocked",
    stateMutability: "view",
    inputs: [{ type: "address" }],
    outputs: [{ type: "bool" }],
  },
] as const;

/** ERC-1967 implementation slot, so the app can tell when the token's code has been swapped. */
export const IMPLEMENTATION_SLOT = "0x360894a13ba1a3210667c828492db98dca3e2076cc3735a920a3ca505d382bbc" as const;

/** The implementation the wrapper ran on 2 September 2026, when its source was read line by line. */
export const REVIEWED_IMPLEMENTATION = "0xae37b998d453e1fabe85dd46cf04295ca4a3af04" as const;
