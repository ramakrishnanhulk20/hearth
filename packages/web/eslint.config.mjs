import next from "eslint-config-next/core-web-vitals";
import nextTypescript from "eslint-config-next/typescript";

// eslint-config-next 16 ships flat config arrays directly, so there is no eslintrc bridge here.
const config = [
  { ignores: [".next/**", ".next-verify/**", "node_modules/**", "next-env.d.ts", "src/lib/chain/abis.ts"] },
  ...next,
  ...nextTypescript,
  {
    rules: {
      "@typescript-eslint/no-unused-vars": ["error", { argsIgnorePattern: "^_", varsIgnorePattern: "^_" }],
    },
  },
];

export default config;
