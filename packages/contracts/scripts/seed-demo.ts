import { ethers, deployments, fhevm, network } from "hardhat";
import { networkConfig, units } from "../lantern.config";

const MINT = units(40_000);
const WRAP = units(8_000);
const RESERVE = units(2_500);
const DEPOSIT = units(1_250);

const ERC20_ABI = [
  "function mint(address to, uint256 amount)",
  "function approve(address spender, uint256 amount) returns (bool)",
  "function balanceOf(address owner) view returns (uint256)",
];

const CONFIDENTIAL_ABI = [
  "function wrap(address to, uint256 amount) returns (bytes32)",
  "function confidentialTransferAndCall(address to, bytes32 encryptedAmount, bytes inputProof, bytes data) returns (bytes32)",
];

const money = (raw: bigint) => (Number(raw) / 1e6).toFixed(2);

async function main() {
  const config = networkConfig(network.name);
  const [signer] = await ethers.getSigners();
  await fhevm.initializeCLIApi();

  const record = await deployments.get("LanternPool");
  const pool = await ethers.getContractAt("LanternPool", record.address, signer);

  const assetAddress = await pool.asset();
  const underlyingAddress = await pool.underlying();
  const underlying = new ethers.Contract(underlyingAddress, ERC20_ABI, signer);
  const asset = new ethers.Contract(assetAddress, CONFIDENTIAL_ABI, signer);

  console.log(`pool ${record.address} on ${network.name}`);

  console.log("\nminting and wrapping");
  await (await underlying.mint(signer.address, MINT)).wait();
  await (await underlying.approve(assetAddress, WRAP)).wait();
  await (await asset.wrap(signer.address, WRAP)).wait();
  console.log(`  wrapped ${money(WRAP)}`);

  console.log("\nfunding the prize reserve");
  await (await underlying.approve(record.address, RESERVE)).wait();
  await (await pool.fundReserve(RESERVE)).wait();
  console.log(`  reserve ${money(await pool.reserve())}, ${money(config.prizePerDraw)} per draw`);

  console.log("\ndepositing, and leaving it in");
  const input = await fhevm.createEncryptedInput(assetAddress, signer.address).add64(DEPOSIT).encrypt();
  await (
    await asset.confidentialTransferAndCall(record.address, input.handles[0], input.inputProof, "0x")
  ).wait();
  console.log(`  deposited ${money(DEPOSIT)} (encrypted)`);

  if ((await pool.phase()) === 0n && (await pool.reserve()) >= (await pool.prizePerDraw())) {
    console.log("\nsettling one draw so the page has history");
    await (await pool.openDraw()).wait();
    while ((await pool.phase()) === 1n) {
      await (await pool.scanChunk(await pool.maxChunk())).wait();
    }
    console.log(`  draw ${await pool.drawId()} settled`);
  }

  console.log("\nwhat the landing page will now read:");
  console.log(`  jackpot        ${money(await pool.jackpot())}`);
  console.log(`  reserve        ${money(await pool.reserve())}`);
  console.log(`  draws settled  ${await pool.drawId()}`);
  console.log(`  depositors     ${(await pool.depositorCount()) - 1n} (excluding the house ticket)`);
  console.log(`  sealed handle  ${await pool.confidentialBalanceOf(signer.address)}`);
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
