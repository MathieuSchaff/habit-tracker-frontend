FROM oven/bun:1.3.12-alpine AS builder
WORKDIR /app

# bunfig.toml pins the repo's Bun linker policy; keep it in the image.
COPY package.json bun.lock bunfig.toml ./
COPY frontend/package.json frontend/
COPY shared/package.json shared/
COPY backend/package.json backend/
COPY vendor/ vendor/
RUN bun install --frozen-lockfile

# Source for typecheck and Vite build.
COPY frontend/ frontend/
COPY shared/ shared/
COPY backend/ backend/

# Emit shared/dist + backend/dist declarations for the frontend `tsc -b`. Build from the
# backend build project (references ../shared), not the solution tsconfig - that pulls
# tsconfig.test.json whose *.test.ts inputs are stripped by .dockerignore (TS18003 "no inputs found").
RUN bun x tsc -b backend/tsconfig.build.json --force

# Typecheck + Vite build
WORKDIR /app/frontend
ENV NODE_ENV=production
# Faro RUM/analytics collector URL, baked at build time (import.meta.env). Empty =
# initFaro() returns null → no telemetry. For Grafana Cloud: Frontend Observability app URL.
ARG VITE_FARO_URL=""
ARG VITE_APP_VERSION="prod"
ARG VITE_API_URL="http://api:3000"
ENV VITE_FARO_URL=${VITE_FARO_URL}
ENV VITE_APP_VERSION=${VITE_APP_VERSION}
ENV VITE_API_URL=${VITE_API_URL}
RUN bun run build

# Runtime SSR server (nitro bun preset). .output is a self-contained bundle —
# server entry + public assets, no node_modules — so the final image is just Bun.
FROM oven/bun:1.3.12-alpine
WORKDIR /app
COPY --from=builder /app/frontend/.output ./.output
ENV NODE_ENV=production
ENV PORT=3000
EXPOSE 3000
CMD ["bun", "run", ".output/server/index.mjs"]
