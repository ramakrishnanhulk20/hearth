import { ethers, network } from "hardhat";

async function main() {
  const chain = await ethers.provider.getNetwork();
  const signers = await ethers.getSigners();
  console.log(`network ${network.name}, chainId ${chain.chainId}, ${signers.length} signer(s)`);

  for (const signer of signers) {
    const balance = await ethers.provider.getBalance(signer.address);
    console.log(`  ${signer.address}  ${ethers.formatEther(balance)} ETH`);
  }
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
