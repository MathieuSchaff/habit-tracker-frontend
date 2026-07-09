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
ENV VITE_FARO_URL=${VITE_FARO_URL}
ENV VITE_APP_VERSION=${VITE_APP_VERSION}
RUN bun run build

# 1.30.2-alpine, digest-pinned (CVE-2026-42945 fixed in >=1.30.1). Bump digest to update.
FROM nginx:1.30.2-alpine@sha256:5f979dcfed4ce6461873f087e8c980d6e29b084b9e8776d9704a7e989b5f4898
COPY frontend/nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=builder /app/frontend/dist /usr/share/nginx/html
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
