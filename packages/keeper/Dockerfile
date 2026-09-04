# The keeper is a long-running process, so it needs a host that stays up rather than a
# serverless function: one pass can take two minutes waiting on the key management service.
FROM node:22-alpine AS build
WORKDIR /repo

# The lockfile lives at the workspace root, and npm needs the whole workspace to resolve it.
COPY package.json package-lock.json ./
COPY packages/keeper/package.json packages/keeper/
RUN npm ci --omit=dev --workspace @hearth/keeper --include-workspace-root

COPY packages/keeper packages/keeper
RUN npm install --no-save typescript@5.9.3 \
 && npx tsc -p packages/keeper/tsconfig.json \
 && rm -rf node_modules/typescript

FROM node:22-alpine
WORKDIR /repo
ENV NODE_ENV=production
COPY --from=build /repo/node_modules node_modules
COPY --from=build /repo/packages/keeper/dist packages/keeper/dist
COPY --from=build /repo/packages/keeper/package.json packages/keeper/

# No shell wrapper, so a stop signal reaches node itself and the keeper finishes its pass.
CMD ["node", "packages/keeper/dist/src/index.js"]
