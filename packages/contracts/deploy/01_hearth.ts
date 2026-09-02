import { existsSync, mkdirSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import type { DeployFunction, DeployResult } from "hardhat-deploy/types";
import type { HardhatRuntimeEnvironment } from "hardhat/types";
import { hasCanonicalAsset, networkConfig } from "../hearth.config";
import type { HearthNetwork } from "../hearth.config";

const ZERO = "0x0000000000000000000000000000000000000000";

type TokenPair = { readonly asset: string; readonly underlying: string };

function money(units: bigint): string {
  const whole = units / 1_000_000n;
  const fraction = (units % 1_000_000n).toString().padStart(6, "0").replace(/0+$/, "");
  return fraction === "" ? `${whole}` : `${whole}.${fraction}`;
}

/**
 * `firstPeriodAt` is immutable and has to be at or before the deployment block, so it is read from
 * the chain's clock rather than the machine's. A redeploy reuses whatever the saved deployment
 * recorded, which is what keeps a second run of this script a no-op.
 */
async function firstPeriodAt(hre: HardhatRuntimeEnvironment, config: HearthNetwork): Promise<bigint> {
  const existing = await hre.deployments.getOrNull("HearthVault");
  const recorded = existing?.args?.[2];
  if (recorded !== undefined) return BigInt(recorded as string | number | bigint);

  const block = await hre.ethers.provider.getBlock("latest");
  if (block === null) throw new Error("the node returned no latest block, so the clock cannot be read");
  const now = BigInt(block.timestamp);
  return config.firstPeriodAt === "top-of-hour" ? (now / 3_600n) * 3_600n : now;
}

async function tokenPair(
  hre: HardhatRuntimeEnvironment,
  config: HearthNetwork,
  deployer: string,
): Promise<TokenPair> {
  if (hasCanonicalAsset(config)) {
    const asset = config.asset as string;
    const underlying = config.underlying as string;
    if ((await hre.ethers.provider.getCode(asset)) === "0x") {
      throw new Error(`hearth.config.ts names ${asset} as the asset, but there is no contract there.`);
    }
    hre.deployments.log(`Using the confidential asset already on this network at ${asset}.`);
    hre.deployments.log(`It wraps the public token at ${underlying}.`);
    return { asset, underlying };
  }

  const underlying = await hre.deployments.deploy("TestUSDC", { from: deployer, args: [], log: true });
  const asset = await hre.deployments.deploy("ConfidentialUSDC", {
    from: deployer,
    args: [underlying.address],
    log: true,
  });
  hre.deployments.log(`Deployed a local token pair: TestUSDC at ${underlying.address}, wrapped by ${asset.address}.`);
  return { asset: asset.address, underlying: underlying.address };
}

const deployHearth: DeployFunction = async (hre: HardhatRuntimeEnvironment) => {
  const config = networkConfig(hre.network.name);
  const { deployer } = await hre.getNamedAccounts();
  const { log } = hre.deployments;

  log(`Deploying Hearth to ${hre.network.name} from ${deployer}.`);

  const { asset, underlying } = await tokenPair(hre, config, deployer);
  const start = await firstPeriodAt(hre, config);

  const vault: DeployResult = await hre.deployments.deploy("HearthVault", {
    from: deployer,
    args: [asset, config.periodLength, start, deployer],
    log: true,
  });
  log(
    `HearthVault is at ${vault.address}. A period lasts ${config.periodLength} seconds and period 1 started at ${start}.`,
  );

  const pool: DeployResult = await hre.deployments.deploy("HearthPrizePool", {
    from: deployer,
    args: [vault.address, asset, config.tiers, config.initialScaleBits, deployer],
    log: true,
  });
  log(`HearthPrizePool is at ${pool.address}. Its draws start against a range of 2^${config.initialScaleBits}.`);
  for (const [index, tier] of config.tiers.entries()) {
    log(
      `  Tier ${index}: ${tier.prizeCount} prize(s) per draw at odds ${tier.oddsNumerator}/${tier.oddsDenominator}, ` +
        `${tier.shares} shares of every harvest, carry published every ${tier.reconcileEvery} draw(s).`,
    );
  }

  const wiredPool = (await hre.deployments.read("HearthVault", "prizePool")) as string;
  if (wiredPool === ZERO) {
    await hre.deployments.execute("HearthVault", { from: deployer, log: true }, "setPrizePool", pool.address);
    log(`The vault now accepts prize funding from ${pool.address} and from nobody else.`);
  } else {
    log(`The vault already points at the prize pool ${wiredPool}, so that wiring step is skipped.`);
  }

  const source: DeployResult = await hre.deployments.deploy("SponsoredYieldSource", {
    from: deployer,
    args: [asset, pool.address, config.sponsorRatePerSecond, deployer],
    log: true,
  });
  log(
    `SponsoredYieldSource is at ${source.address}. It releases ${money(config.sponsorRatePerSecond)} USDC ` +
      `a second, which is ${money(config.sponsorRatePerSecond * config.periodLength)} USDC a period.`,
  );

  const wiredSource = (await hre.deployments.read("HearthPrizePool", "yieldSource")) as string;
  if (wiredSource === ZERO) {
    await hre.deployments.execute(
      "HearthPrizePool",
      { from: deployer, log: true },
      "setYieldSource",
      source.address,
    );
    log(`The pool now harvests from ${source.address} at every close.`);
  } else {
    log(`The pool already harvests from ${wiredSource}, so that wiring step is skipped.`);
  }

  const record = {
    vault: vault.address,
    pool: pool.address,
    source: source.address,
    asset,
    underlying,
    firstPeriodAt: Number(start),
    periodLength: Number(config.periodLength),
  };

  // `hardhat node` serves the in-process chain, so it deploys under the name "hardhat" while
  // hardhat-deploy saves the records under "localhost". The address file follows those records,
  // and is skipped entirely when nothing was saved, because a chain that ends with the process
  // would leave the keeper and the app pointing at addresses that no longer exist.
  const folder = hre.network.name === "hardhat" ? "localhost" : hre.network.name;
  const directory = join(hre.config.paths.deployments, folder);
  if (existsSync(join(directory, "HearthVault.json"))) {
    const file = join(directory, "hearth.json");
    mkdirSync(dirname(file), { recursive: true });
    writeFileSync(file, `${JSON.stringify(record, null, 2)}\n`, "utf8");
    log(`Wrote the addresses to ${file}, which is what HEARTH_ADDRESSES_FILE points the keeper at.`);
  } else {
    log("This run saved no deployment records, so no address file was written.");
  }

  log("Nothing is seeded yet. Run hearth:seed to sponsor the yield source and fund the demo savers.");
};

deployHearth.tags = ["hearth"];

export default deployHearth;
