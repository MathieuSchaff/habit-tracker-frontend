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
FROM nginx:1.27-alpine
COPY frontend/nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=builder /app/frontend/dist /usr/share/nginx/html
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
