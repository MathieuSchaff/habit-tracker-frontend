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

# 🔥 Plus besoin de rm -rf car typescript n'est pas dans shared/
RUN bunx tsc -b shared/tsconfig.json

WORKDIR /app/backend
EXPOSE 3000
CMD ["bun", "--watch", "src/index.ts"]

# prod
FROM oven/bun:1.3.12-debian AS prod
WORKDIR /app
ENV NODE_ENV=production

# 1. On copie les fichiers de configuration racine
COPY package.json bun.lock tsconfig.json bunfig.toml ./

# 2. On prépare TOUS les dossiers (y compris frontend)
RUN mkdir -p backend shared frontend

# 3. On copie les manifestes de TOUS les packages
COPY backend/package.json backend/
COPY shared/package.json shared/
COPY frontend/package.json frontend/
COPY vendor/ vendor/

# 4. L'installation fonctionnera maintenant
RUN bun install --frozen-lockfile

# 5. On continue le reste
COPY backend/ ./backend/
COPY shared/ ./shared/

RUN cd /app/shared && bun run build

USER bun
EXPOSE 3000
CMD ["bun", "backend/src/index.ts"]
