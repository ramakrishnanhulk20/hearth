import type { NextConfig } from "next";

const UNUSED_OPTIONAL_PEERS = [
  "@x402/core/client",
  "@x402/evm",
  "@x402/evm/exact/client",
  "@x402/evm/upto/client",
  "@x402/svm/exact/client",
  "@react-native-async-storage/async-storage",
  "pino-pretty",
  "lokijs",
  "encoding",
];

const nextConfig: NextConfig = {

  reactStrictMode: false,

  distDir: process.env.NEXT_DIST_DIR || ".next",
  webpack: (config) => {
    config.resolve.alias = {
      ...config.resolve.alias,
      ...Object.fromEntries(UNUSED_OPTIONAL_PEERS.map((name) => [name, false as const])),
    };
    config.ignoreWarnings = [
      ...(config.ignoreWarnings ?? []),
      { module: /node_modules[\/]ox[\/]_esm[\/]tempo[\/]/ },
    ];
    return config;
  },
};

export default nextConfig;
