import { existsSync, mkdirSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import type { DeployFunction, DeployResult } from "hardhat-deploy/types";
import type { HardhatRuntimeEnvironment } from "hardhat/types";
import {
  LEGACY_ADDRESS_FILE,
  addressFileName,
  deploymentName,
  hasCanonicalAsset,
  poolConfig,
} from "../hearth.config";
import type { HearthPool } from "../hearth.config";

const ZERO = "0x0000000000000000000000000000000000000000";

/**
 * A contract that already has a saved deployment is reused, never replaced. hardhat-deploy would
 * otherwise redeploy whenever the compiled bytecode moved, and the first pool's bytecode has already
 * moved: it holds savers' money and days of draw history, so a fresh address would strand both. To
 * deliberately replace one, delete its file under deployments/<network>/ first.
 */
const KEEP_LIVE = { skipIfAlreadyDeployed: true } as const;

type TokenPair = { readonly asset: string; readonly underlying: string };

/** Only what the deploy reads off the two tokens, so the same code drives ours and Zama's. */
const METADATA_ABI = ["function decimals() view returns (uint8)", "function symbol() view returns (string)"];

function money(units: bigint, unit: string): string {
  const whole = units / 1_000_000n;
  const fraction = (units % 1_000_000n).toString().padStart(6, "0").replace(/0+$/, "");
  return `${fraction === "" ? `${whole}` : `${whole}.${fraction}`} ${unit}`;
}

/** Which pool this run deploys. One slug a run, because one deployer nonce runs one deploy. */
function selected(hre: HardhatRuntimeEnvironment): HearthPool {
  return poolConfig(hre.network.name, process.env.HEARTH_TOKEN);
}

/**
 * `firstPeriodAt` is immutable and has to be at or before the deployment block, so it is read from
 * the chain's clock rather than the machine's. A redeploy reuses whatever the saved deployment
 * recorded, which is what keeps a second run of this script a no-op.
 */
async function firstPeriodAt(hre: HardhatRuntimeEnvironment, pool: HearthPool): Promise<bigint> {
  const existing = await hre.deployments.getOrNull(deploymentName("HearthVault", pool.slug));
  const recorded = existing?.args?.[2];
  if (recorded !== undefined) return BigInt(recorded as string | number | bigint);

  const block = await hre.ethers.provider.getBlock("latest");
  if (block === null) throw new Error("the node returned no latest block, so the clock cannot be read");
  const now = BigInt(block.timestamp);
  return pool.firstPeriodAt === "top-of-hour" ? (now / 3_600n) * 3_600n : now;
}

async function tokenPair(
  hre: HardhatRuntimeEnvironment,
  pool: HearthPool,
  deployer: string,
): Promise<TokenPair> {
  if (hasCanonicalAsset(pool)) {
    const asset = pool.asset as string;
    const underlying = pool.underlying as string;
    if ((await hre.ethers.provider.getCode(asset)) === "0x") {
      throw new Error(`hearth.config.ts names ${asset} as the ${pool.slug} asset, but there is no contract there.`);
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
  const pool = selected(hre);
  const { deployer } = await hre.getNamedAccounts();
  const { log } = hre.deployments;
  const name = (base: string): string => deploymentName(base, pool.slug);
  const unit = pool.unit;

  log(`Deploying the Hearth ${unit} pool to ${hre.network.name} from ${deployer}.`);

  const { asset, underlying } = await tokenPair(hre, pool, deployer);
  const start = await firstPeriodAt(hre, pool);

  const wrapper = new hre.ethers.Contract(asset, METADATA_ABI, hre.ethers.provider);
  const decimals = Number(await wrapper.decimals());
  if (decimals !== pool.decimals) {
    throw new Error(
      `${asset} reads ${decimals} decimals and hearth.config.ts expects ${pool.decimals}. Every amount in the ` +
        "config is in wrapper base units, so a different scale would size every stake and prize wrongly.",
    );
  }

  const vault: DeployResult = await hre.deployments.deploy(name("HearthVault"), {
    contract: "HearthVault",
    from: deployer,
    args: [asset, pool.periodLength, start, deployer],
    log: true,
    ...KEEP_LIVE,
  });
  log(
    `HearthVault is at ${vault.address}. A period lasts ${pool.periodLength} seconds and period 1 started at ${start}.`,
  );

  const prizePool: DeployResult = await hre.deployments.deploy(name("HearthPrizePool"), {
    contract: "HearthPrizePool",
    from: deployer,
    args: [vault.address, asset, pool.tiers, pool.initialScaleBits, deployer],
    log: true,
    ...KEEP_LIVE,
  });
  log(`HearthPrizePool is at ${prizePool.address}. Its draws start against a range of 2^${pool.initialScaleBits}.`);
  for (const [index, tier] of pool.tiers.entries()) {
    log(
      `  Tier ${index}: ${tier.prizeCount} prize(s) per draw at odds ${tier.oddsNumerator}/${tier.oddsDenominator}, ` +
        `${tier.shares} shares of every harvest, carry published every ${tier.reconcileEvery} draw(s).`,
    );
  }

  const wiredPool = (await hre.deployments.read(name("HearthVault"), "prizePool")) as string;
  if (wiredPool === ZERO) {
    await hre.deployments.execute(name("HearthVault"), { from: deployer, log: true }, "setPrizePool", prizePool.address);
    log(`The vault now accepts prize funding from ${prizePool.address} and from nobody else.`);
  } else {
    log(`The vault already points at the prize pool ${wiredPool}, so that wiring step is skipped.`);
  }

  const source: DeployResult = await hre.deployments.deploy(name("SponsoredYieldSource"), {
    contract: "SponsoredYieldSource",
    from: deployer,
    args: [asset, prizePool.address, pool.sponsorRatePerSecond, deployer],
    log: true,
    ...KEEP_LIVE,
  });
  log(
    `SponsoredYieldSource is at ${source.address}. It releases ${money(pool.sponsorRatePerSecond, unit)} ` +
      `a second, which is ${money(pool.sponsorRatePerSecond * pool.periodLength, unit)} a period.`,
  );

  const wiredSource = (await hre.deployments.read(name("HearthPrizePool"), "yieldSource")) as string;
  if (wiredSource === ZERO) {
    await hre.deployments.execute(
      name("HearthPrizePool"),
      { from: deployer, log: true },
      "setYieldSource",
      source.address,
    );
    log(`The pool now harvests from ${source.address} at every close.`);
  } else {
    log(`The pool already harvests from ${wiredSource}, so that wiring step is skipped.`);
  }

  const public20 = new hre.ethers.Contract(underlying, METADATA_ABI, hre.ethers.provider);
  const legacy = {
    vault: vault.address,
    pool: prizePool.address,
    source: source.address,
    asset,
    underlying,
    firstPeriodAt: Number(start),
    periodLength: Number(pool.periodLength),
  };
  const record = {
    ...legacy,
    slug: pool.slug,
    symbol: (await wrapper.symbol()) as string,
    underlyingSymbol: (await public20.symbol()) as string,
    // The name Zama's address book prints. It comes from the config rather than the wrapper's own
    // `name()` so a saver reads the same name in the app that Zama's own token list shows.
    name: pool.displayName,
    decimals,
    keeperAccountIndex: pool.keeperAccountIndex,
  };

  // `hardhat node` serves the in-process chain, so it deploys under the name "hardhat" while
  // hardhat-deploy saves the records under "localhost". The address file follows those records,
  // and is skipped entirely when nothing was saved, because a chain that ends with the process
  // would leave the keeper and the app pointing at addresses that no longer exist.
  const folder = hre.network.name === "hardhat" ? "localhost" : hre.network.name;
  const directory = join(hre.config.paths.deployments, folder);
  if (existsSync(join(directory, `${name("HearthVault")}.json`))) {
    const write = (file: string, contents: unknown): void => {
      const path = join(directory, file);
      mkdirSync(dirname(path), { recursive: true });
      writeFileSync(path, `${JSON.stringify(contents, null, 2)}\n`, "utf8");
      log(`Wrote the addresses to ${path}, which is what HEARTH_ADDRESSES_FILE points a keeper at.`);
    };
    write(addressFileName(pool.slug), record);
    // The running keeper and the live app were pointed at this file before the other pools existed.
    // It keeps the seven fields it has always had, and once written it is never rewritten, so a
    // later run cannot move a live keeper off the pool it has been drawing for days.
    if (pool.slug === "usdc" && !existsSync(join(directory, LEGACY_ADDRESS_FILE))) {
      write(LEGACY_ADDRESS_FILE, legacy);
    }
  } else {
    log("This run saved no deployment records, so no address file was written.");
  }

  log(`Nothing is seeded yet. Run hearth:seed --token ${pool.slug} to sponsor the yield source and fund the savers.`);
};

deployHearth.tags = ["hearth"];

export default deployHearth;
