import type { HardhatRuntimeEnvironment } from "hardhat/types";
import type { DeployFunction } from "hardhat-deploy/types";
import { networkConfig } from "../lantern.config";

const deployLantern: DeployFunction = async function (hre: HardhatRuntimeEnvironment) {
  const { deployments, getNamedAccounts, network } = hre;
  const { deploy, log } = deployments;
  const { deployer } = await getNamedAccounts();

  const config = networkConfig(network.name);

  let asset = config.asset;
  let underlying = config.underlying;

  if (!asset || !underlying) {
    log("no canonical confidential token on this network, deploying a local pair");

    const testUsdc = await deploy("TestUSDC", { from: deployer, log: true, args: [] });
    const confidentialUsdc = await deploy("ConfidentialUSDC", {
      from: deployer,
      log: true,
      args: [testUsdc.address],
    });

    underlying = testUsdc.address;
    asset = confidentialUsdc.address;
  } else {
    log(`using Zama's confidential token at ${asset}, wrapping ${underlying}`);
  }

  const pool = await deploy("LanternPool", {
    from: deployer,
    log: true,
    args: [asset, underlying, config.prizePerDraw, config.drawInterval, deployer],
  });

  log(`LanternPool ${pool.address}`);
  log(`  asset        ${asset}`);
  log(`  underlying   ${underlying}`);
  log(`  prize        ${config.prizePerDraw} base units per draw`);
  log(`  interval     ${config.drawInterval}s`);
};

deployLantern.tags = ["Lantern"];
export default deployLantern;
