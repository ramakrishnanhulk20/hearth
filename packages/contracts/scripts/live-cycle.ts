import { ethers, deployments, fhevm, network } from "hardhat";
import { FhevmType } from "@fhevm/hardhat-plugin";
import { networkConfig, units } from "../lantern.config";

const MINT = units(20_000);
const WRAP = units(5_000);
const RESERVE = units(1_000);
const DEPOSIT = units(750);

const ERC20_ABI = [
  "function mint(address to, uint256 amount)",
  "function approve(address spender, uint256 amount) returns (bool)",
  "function balanceOf(address owner) view returns (uint256)",
];

const CONFIDENTIAL_ABI = [
  "function wrap(address to, uint256 amount) returns (bytes32)",
  "function confidentialBalanceOf(address account) view returns (bytes32)",
  "function confidentialTransferAndCall(address to, bytes32 encryptedAmount, bytes inputProof, bytes data) returns (bytes32)",
];

const money = (raw: bigint) => `${(Number(raw) / 1e6).toFixed(2)}`;

let step = 0;
function heading(text: string) {
  step += 1;
  console.log(`\n${step}. ${text}`);
}

async function main() {
  const config = networkConfig(network.name);
  const [signer] = await ethers.getSigners();
  const me = signer.address;

  await fhevm.initializeCLIApi();

  const poolDeployment = await deployments.get("LanternPool");
  const pool = await ethers.getContractAt("LanternPool", poolDeployment.address, signer);
  const poolAddress = poolDeployment.address;

  const assetAddress = await pool.asset();
  const underlyingAddress = await pool.underlying();
  const underlying = new ethers.Contract(underlyingAddress, ERC20_ABI, signer);
  const asset = new ethers.Contract(assetAddress, CONFIDENTIAL_ABI, signer);

  console.log(`network      ${network.name}`);
  console.log(`pool         ${poolAddress}`);
  console.log(`asset        ${assetAddress}  (Zama's confidential USDC)`);
  console.log(`underlying   ${underlyingAddress}`);
  console.log(`account      ${me}`);

  heading("Get test tokens. Zama's mock USDC has an open mint, so no faucet of ours is needed.");
  await (await underlying.mint(me, MINT)).wait();
  console.log(`   minted ${money(MINT)} USDC, wallet now holds ${money(await underlying.balanceOf(me))}`);

  heading("Approve and wrap. This is the last step whose amount is public.");
  await (await underlying.approve(assetAddress, WRAP)).wait();
  await (await asset.wrap(me, WRAP)).wait();
  console.log(`   wrapped ${money(WRAP)} into confidential USDC (visible on chain, by nature)`);

  heading("Fund the prize reserve. Public on purpose, so solvency is checkable.");
  await (await underlying.approve(poolAddress, RESERVE)).wait();
  await (await pool.fundReserve(RESERVE)).wait();
  console.log(`   reserve now ${money(await pool.reserve())}, jackpot per draw ${money(config.prizePerDraw)}`);

  heading("Deposit. The amount is encrypted in this process and never leaves it in the clear.");
  const startedEncrypting = Date.now();
  const input = await fhevm.createEncryptedInput(assetAddress, me).add64(DEPOSIT).encrypt();
  console.log(`   encrypting ${money(DEPOSIT)} took ${((Date.now() - startedEncrypting) / 1000).toFixed(1)}s`);

  const depositTx = await asset.confidentialTransferAndCall(poolAddress, input.handles[0], input.inputProof, "0x");
  const depositReceipt = await depositTx.wait();
  console.log(`   deposited in one transaction, no approval of the pool, gas ${depositReceipt?.gasUsed}`);

  heading("Read our own balance back, through the EIP-712 user decryption flow.");
  const balanceHandle = await pool.confidentialBalanceOf(me);
  const balance = await fhevm.userDecryptEuint(FhevmType.euint64, balanceHandle, poolAddress, signer);
  console.log(`   pool balance decrypts to ${money(balance)}`);
  if (balance !== DEPOSIT) throw new Error(`expected ${DEPOSIT}, chain says ${balance}`);

  heading("Confirm nobody else can read it. This is the whole product.");
  const outsider = ethers.Wallet.createRandom().connect(ethers.provider);
  try {
    await fhevm.userDecryptEuint(FhevmType.euint64, balanceHandle, poolAddress, outsider);
    throw new Error("LEAKED: a wallet with no rights decrypted the balance");
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    if (message.startsWith("LEAKED")) throw error;
    console.log(`   refused, as it must be: ${message.split("\n")[0].slice(0, 90)}`);
  }

  heading("Run a draw.");
  const participants = await pool.depositorCount();
  const openTx = await pool.openDraw();
  const openReceipt = await openTx.wait();
  console.log(`   draw ${await pool.drawId()} opened over ${participants} participants, gas ${openReceipt?.gasUsed}`);

  let scans = 0;
  let scanGas = 0n;
  while ((await pool.phase()) === 1n) {
    const chunk = await pool.maxChunk();
    const scanTx = await pool.scanChunk(chunk);
    const scanReceipt = await scanTx.wait();
    scans += 1;
    scanGas += scanReceipt?.gasUsed ?? 0n;
    console.log(`   scanned to ${await pool.scanCursor()}/${await pool.scanEnd()}, gas ${scanReceipt?.gasUsed}`);
  }
  console.log(`   settled in ${scans} transaction(s), ${scanGas} gas total`);

  heading("Find out whether we won. Only we can.");
  const winningsHandle = await pool.confidentialWinningsOf(me);
  const winnings = await fhevm.userDecryptEuint(FhevmType.euint64, winningsHandle, poolAddress, signer);
  console.log(`   winnings decrypt to ${money(winnings)}`);
  console.log(
    winnings > 0n
      ? "   we won this draw. Nothing on chain says so to anyone else."
      : "   we did not win this draw. The house ticket did, or another depositor.",
  );

  heading("Claim, which is safe and uninformative to call whether or not we won.");
  const claimReceipt = await (await pool.claim()).wait();
  const afterClaim = await fhevm.userDecryptEuint(
    FhevmType.euint64,
    await pool.confidentialWinningsOf(me),
    poolAddress,
    signer,
  );
  console.log(`   claimed, winnings now ${money(afterClaim)}, gas ${claimReceipt?.gasUsed}`);

  heading("Withdraw the principal in full. No loss, at any time.");
  const exit = await fhevm.createEncryptedInput(poolAddress, me).add64(DEPOSIT).encrypt();
  const withdrawReceipt = await (await pool.withdraw(exit.handles[0], exit.inputProof)).wait();
  const remaining = await fhevm.userDecryptEuint(
    FhevmType.euint64,
    await pool.confidentialBalanceOf(me),
    poolAddress,
    signer,
  );
  console.log(`   withdrew, pool balance now ${money(remaining)}, gas ${withdrawReceipt?.gasUsed}`);
  if (remaining !== 0n) throw new Error(`principal not fully returned, ${remaining} left behind`);

  console.log("\nEvery step above happened on chain. Deposit, draw, claim and withdraw all hold.");
}

main().catch((error) => {
  console.error(`\nFAILED: ${error instanceof Error ? error.message : error}`);
  process.exitCode = 1;
});
