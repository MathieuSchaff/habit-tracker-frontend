# Frontend Dockerfile (Production)
FROM oven/bun:1.3.12-alpine AS builder
WORKDIR /app

# Manifests workspace
COPY package.json bun.lock ./
COPY frontend/package.json frontend/
COPY shared/package.json shared/
COPY backend/package.json backend/
COPY vendor/ vendor/
RUN bun install --frozen-lockfile

# Source needed for typecheck + Vite build
COPY frontend/ frontend/
COPY shared/ shared/
COPY backend/ backend/

# Build declarations consumed by frontend/package.json `tsc -b`
RUN cd /app/shared && bun run build
RUN cd /app/backend && bun run build

# Typecheck + Vite build
WORKDIR /app/frontend
ENV NODE_ENV=production
RUN bun run build

# Production : Nginx
# 1.30.2-alpine, digest-pinned (CVE-2026-42945 fixed in >=1.30.1). Bump digest to update.
FROM nginx:1.30.2-alpine@sha256:5f979dcfed4ce6461873f087e8c980d6e29b084b9e8776d9704a7e989b5f4898
COPY frontend/nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=builder /app/frontend/dist /usr/share/nginx/html
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
