import { config as loadEnv } from "dotenv";
import "@fhevm/hardhat-plugin";
import "@nomicfoundation/hardhat-chai-matchers";
import "@nomicfoundation/hardhat-ethers";
import "@nomicfoundation/hardhat-verify";
import "@typechain/hardhat";
import "hardhat-deploy";
import type { HardhatUserConfig } from "hardhat/config";
import { vars } from "hardhat/config";

loadEnv();

function secret(name: string, fallback = ""): string {
  return process.env[name] ?? vars.get(name, fallback);
}

const HARDHAT_DEFAULT_ACCOUNTS = "test test test test test test test test test test test junk";
// RECOVERY_PHRASE is the name the wallet export uses; MNEMONIC is kept for older env files.
const MNEMONIC = secret("RECOVERY_PHRASE") || secret("MNEMONIC", HARDHAT_DEFAULT_ACCOUNTS);
const SEPOLIA_RPC_URL = secret("SEPOLIA_RPC_URL", "https://ethereum-sepolia-rpc.publicnode.com");
const ETHERSCAN_API_KEY = secret("ETHERSCAN_API_KEY");
const PRIVATE_KEY = secret("PRIVATE_KEY");

function sepoliaAccounts(): string[] | { mnemonic: string; count: number } {
  if (MNEMONIC !== HARDHAT_DEFAULT_ACCOUNTS) return { mnemonic: MNEMONIC, count: 10 };
  if (PRIVATE_KEY) return [PRIVATE_KEY.startsWith("0x") ? PRIVATE_KEY : `0x${PRIVATE_KEY}`];
  return { mnemonic: MNEMONIC, count: 10 };
}

const config: HardhatUserConfig = {
  defaultNetwork: "hardhat",

  namedAccounts: {
    deployer: 0,
    keeper: 1,
    alice: 2,
    bob: 3,
    carol: 4,
    dave: 5,
  },
  etherscan: {

    apiKey: ETHERSCAN_API_KEY,
  },
  networks: {
    hardhat: {
      accounts: { mnemonic: MNEMONIC, count: 10 },
      chainId: 31337,
    },
    localhost: {
      accounts: { mnemonic: MNEMONIC, count: 10 },
      chainId: 31337,
      url: "http://127.0.0.1:8545",
    },
    sepolia: {
      accounts: sepoliaAccounts(),
      chainId: 11155111,
      url: SEPOLIA_RPC_URL,
    },
  },
  paths: {
    artifacts: "./artifacts",
    cache: "./cache",
    deploy: "./deploy",
    deployments: "./deployments",
    sources: "./contracts",
    tests: "./test",
  },
  solidity: {
    version: "0.8.27",
    settings: {
      metadata: { bytecodeHash: "none" },
      optimizer: { enabled: true, runs: 800 },
      evmVersion: "cancun",
    },
  },
  typechain: {
    outDir: "types",
    target: "ethers-v6",
  },
  mocha: {
    timeout: 300_000,
  },
};

export default config;
