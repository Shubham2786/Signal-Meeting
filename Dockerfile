# ── Server image (Fastify + core) ──────────────────────────────
FROM node:20-slim AS build
WORKDIR /app

# Build tools for better-sqlite3 (falls back to source if no prebuilt).
RUN apt-get update && apt-get install -y --no-install-recommends \
    python3 build-essential \
    && rm -rf /var/lib/apt/lists/*

# Install deps using only manifests first (better layer caching).
COPY package.json ./
COPY tsconfig.base.json ./
COPY packages/core/package.json packages/core/package.json
COPY server/package.json server/package.json
COPY web/package.json web/package.json
RUN npm install

# Copy sources and build core + server.
COPY packages/core packages/core
COPY server server
RUN npm run build:core && npm run build:server

# ── Runtime ─────────────────────────────────────────────────────
FROM node:20-slim AS runtime
WORKDIR /app
ENV NODE_ENV=production
COPY --from=build /app/node_modules ./node_modules
COPY --from=build /app/package.json ./package.json
COPY --from=build /app/packages/core ./packages/core
COPY --from=build /app/server ./server

EXPOSE 8080
# cwd is /app; DATABASE_URL=file:./data/signal.db → /app/data/signal.db
CMD ["node", "server/dist/index.js"]
