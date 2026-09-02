export type LanternNetwork = {

  readonly asset?: string;

  readonly underlying?: string;

  readonly prizePerDraw: bigint;

  readonly drawInterval: bigint;
};

export const units = (whole: number): bigint => BigInt(whole) * 1_000_000n;

export const NETWORKS: Record<string, LanternNetwork> = {
  sepolia: {
    asset: "0x7c5BF43B851c1dff1a4feE8dB225b87f2C223639",
    underlying: "0x9b5Cd13b8eFbB58Dc25A05CF411D8056058aDFfF",
    prizePerDraw: units(250),

    drawInterval: 60n,
  },
  hardhat: {
    prizePerDraw: units(250),
    drawInterval: 60n,
  },
  localhost: {
    prizePerDraw: units(250),
    drawInterval: 60n,
  },
};

export function networkConfig(name: string): LanternNetwork {
  const config = NETWORKS[name];
  if (!config) throw new Error(`Lantern has no configuration for network "${name}"`);
  return config;
}
