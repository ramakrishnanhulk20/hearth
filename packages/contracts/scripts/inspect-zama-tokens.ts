import { ethers } from "hardhat";

const CANDIDATES: Record<string, string> = {
  cUSDCMock: "0x7c5BF43B851c1dff1a4feE8dB225b87f2C223639",
  cUSDTMock: "0x4E7B06D78965594eB5EF5414c357ca21E1554491",
};

const WRAPPERS_REGISTRY = "0x2f0750Bbb0A246059d80e94c454586a7F27a128e";

const CONFIDENTIAL_ABI = [
  "function name() view returns (string)",
  "function symbol() view returns (string)",
  "function decimals() view returns (uint8)",
  "function underlying() view returns (address)",
  "function rate() view returns (uint256)",
];

const ERC20_ABI = [
  "function name() view returns (string)",
  "function symbol() view returns (string)",
  "function decimals() view returns (uint8)",
  "function totalSupply() view returns (uint256)",
];

const FAUCET_CANDIDATES = ["mint(address,uint256)", "mint(uint256)", "faucet()", "claim()", "drip()", "freeMint()"];

async function main() {
  const provider = ethers.provider;

  for (const [label, address] of Object.entries(CANDIDATES)) {
    console.log(`\n=== ${label} ${address} ===`);
    const token = new ethers.Contract(address, CONFIDENTIAL_ABI, provider);

    try {
      console.log(`  name      ${await token.name()}`);
      console.log(`  symbol    ${await token.symbol()}`);
      console.log(`  decimals  ${await token.decimals()}`);
    } catch {
      console.log("  not a readable ERC-7984 at this address");
      continue;
    }

    let underlying: string;
    try {
      underlying = await token.underlying();
      console.log(`  wraps     ${underlying}`);
    } catch {
      console.log("  no underlying(): this is a standalone confidential token, not a wrapper");
      continue;
    }

    const erc20 = new ethers.Contract(underlying, ERC20_ABI, provider);
    try {
      console.log(`  underlying ${await erc20.symbol()} (${await erc20.decimals()} decimals)`);
      console.log(`  supply     ${await erc20.totalSupply()}`);
    } catch {
      console.log("  underlying is not a readable ERC-20");
    }

    const code = await provider.getCode(underlying);
    const open: string[] = [];
    for (const signature of FAUCET_CANDIDATES) {
      const selector = ethers.id(signature).slice(2, 10);
      if (code.includes(selector)) open.push(signature);
    }
    console.log(`  ways to obtain it: ${open.length > 0 ? open.join(", ") : "none found in bytecode"}`);
  }

  console.log(`\n=== Wrappers registry ${WRAPPERS_REGISTRY} ===`);
  const registry = new ethers.Contract(
    WRAPPERS_REGISTRY,
    ["function getTokenPairsLength() view returns (uint256)"],
    provider,
  );
  try {
    console.log(`  registered pairs: ${await registry.getTokenPairsLength()}`);
  } catch {
    console.log("  could not read pair count with the expected signature");
  }
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
