# base
FROM oven/bun:1.3.12-debian AS base
WORKDIR /app

# deps
FROM base AS deps
COPY package.json bun.lock tsconfig.json bunfig.toml ./
COPY backend/package.json backend/
COPY shared/package.json shared/
COPY frontend/package.json frontend/
COPY vendor/ vendor/
RUN bun install --frozen-lockfile

# dev
FROM base AS dev
COPY --from=deps /app/node_modules ./node_modules

COPY tsconfig.json ./
COPY backend/ ./backend/
COPY shared/ ./shared/

WORKDIR /app/backend
EXPOSE 3000
CMD ["bun", "--watch", "src/index.ts"]

# prod
FROM oven/bun:1.3.12-debian AS prod
WORKDIR /app
ENV NODE_ENV=production

# Manifests racine du workspace
COPY package.json bun.lock tsconfig.json bunfig.toml ./

# Dossiers workspace requis par bun install
RUN mkdir -p backend shared frontend

# Manifests des packages workspace
COPY backend/package.json backend/
COPY shared/package.json shared/
COPY frontend/package.json frontend/
COPY vendor/ vendor/

# Production runtime deps only
RUN bun install --frozen-lockfile --production

# Runtime source
COPY backend/ ./backend/
COPY shared/ ./shared/

USER bun
EXPOSE 3000
CMD ["bun", "backend/src/index.ts"]
