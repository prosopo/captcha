# Build + run the @prosopo/lb-weights service.
# Build context is the repo root (see docker-compose.yml build.context: ../..)
# because the package depends on other workspace packages.
FROM node:24-slim

WORKDIR /app

# Copy the whole monorepo (workspace packages are interdependent) and install.
COPY . .
RUN npm ci

# Type-check build the package and its workspace dependencies (project refs).
RUN npm run -w @prosopo/lb-weights build:tsc

# Resolves @prosopo/* deps via the workspace symlinks in the root node_modules.
CMD ["node", "packages/lb-weights/dist/main.js"]
