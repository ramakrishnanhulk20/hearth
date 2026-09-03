import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactStrictMode: false,

  // Set to .next-verify for a local verification build, so it never fights the running dev server
  // for the same output directory. Leave it unset on Vercel, which looks for .next.
  distDir: process.env.NEXT_DIST_DIR || ".next",
};

export default nextConfig;
