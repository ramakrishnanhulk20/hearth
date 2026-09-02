// pm2 process file for the Hearth keeper.
//
//   npm run build -w @hearth/keeper
//   pm2 start packages/keeper/ecosystem.config.cjs
//   pm2 save && pm2 startup
//
// Run exactly one instance. Two keepers on the same account race for the same nonce.
const { join } = require("node:path");

module.exports = {
  apps: [
    {
      name: "hearth-keeper",
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
      out_file: join(__dirname, "logs", "keeper.log"),
      error_file: join(__dirname, "logs", "keeper-error.log"),
      env: {
        NODE_ENV: "production",
      },
    },
  ],
};
