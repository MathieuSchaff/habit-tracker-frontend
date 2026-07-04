FROM oven/bun:1.3.12-debian@sha256:1b709c9dd883fc1af38c210f7ea5222c552a8d470ea73efbd4b8fcfee798a64b AS base
WORKDIR /app

FROM base AS deps
COPY package.json bun.lock tsconfig.json bunfig.toml ./
COPY backend/package.json backend/
COPY shared/package.json shared/
COPY frontend/package.json frontend/
COPY vendor/ vendor/
RUN bun install --frozen-lockfile

FROM base AS dev
COPY --from=deps /app/node_modules ./node_modules

COPY tsconfig.json ./
COPY backend/ ./backend/
COPY shared/ ./shared/

WORKDIR /app/backend
EXPOSE 3000
CMD ["bun", "--watch", "src/index.ts"]

FROM oven/bun:1.3.12-debian@sha256:1b709c9dd883fc1af38c210f7ea5222c552a8d470ea73efbd4b8fcfee798a64b AS prod
WORKDIR /app
ENV NODE_ENV=production

COPY package.json bun.lock tsconfig.json bunfig.toml ./

# bun install needs the workspace dirs to exist.
RUN mkdir -p backend shared frontend

COPY backend/package.json backend/
COPY shared/package.json shared/
COPY frontend/package.json frontend/
COPY vendor/ vendor/

RUN bun install --frozen-lockfile --production

COPY backend/ ./backend/
COPY shared/ ./shared/

USER bun
EXPOSE 3000
CMD ["bun", "--preload", "./backend/src/instrumentation.ts", "backend/src/index.ts"]
