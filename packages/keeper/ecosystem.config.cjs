// pm2 process file for the Hearth keepers: one process per pool.
//
//   npm run build -w @hearth/keeper
//   pm2 start packages/keeper/ecosystem.config.cjs
//   pm2 save && pm2 startup
//
// Run exactly one process per pool. Two keepers on the same account race for the same nonce,
// which is why every pool signs from its own account index and never shares one.
//
// Before the first start, stop and delete the single process this file replaces:
//
//   pm2 stop hearth-keeper && pm2 delete hearth-keeper
//
// It signs from account 1, the same account hearth-keeper-usdc uses, so the two would fight over
// that account's nonce if both ran. Do that by hand; nothing here does it for you.
const { join } = require("node:path");

// The pool each process drives. The address file names the contracts, the token symbol and the
// decimals; the index here is the account it signs from, and it must match the keeperAccountIndex
// the deploy script wrote into that file. usdc points at hearth.json, the file the first
// deployment wrote before the pools had slugs.
const POOLS = [
  { slug: "usdc", file: "hearth.json", accountIndex: 1 },
  { slug: "usdt", file: "hearth.usdt.json", accountIndex: 10 },
  { slug: "weth", file: "hearth.weth.json", accountIndex: 11 },
  { slug: "bron", file: "hearth.bron.json", accountIndex: 12 },
  { slug: "zama", file: "hearth.zama.json", accountIndex: 13 },
  { slug: "tgbp", file: "hearth.tgbp.json", accountIndex: 14 },
  { slug: "xaut", file: "hearth.xaut.json", accountIndex: 15 },
];

module.exports = {
  apps: POOLS.map((pool) => ({
    name: `hearth-keeper-${pool.slug}`,
    // cwd is what the address file path below is relative to.
    cwd: __dirname,
    script: join(__dirname, "dist", "src", "index.js"),
    interpreter: "node",
    instances: 1,
    exec_mode: "fork",
    autorestart: true,
    // A crash is almost always a bad RPC or a rate limited relayer, so backing off beats
    // restarting into the same wall a hundred times a second.
    exp_backoff_restart_delay: 5_000,
    max_restarts: 100,
    min_uptime: "30s",
    max_memory_restart: "512M",
    kill_timeout: 120_000,
    time: true,
    merge_logs: true,
    out_file: join(__dirname, "logs", `${pool.slug}.log`),
    error_file: join(__dirname, "logs", `${pool.slug}-error.log`),
    env: {
      NODE_ENV: "production",
      HEARTH_ADDRESSES_FILE: `../contracts/deployments/sepolia/${pool.file}`,
      KEEPER_ACCOUNT_INDEX: String(pool.accountIndex),
      KEEPER_NAME: pool.slug,
    },
  })),
};
