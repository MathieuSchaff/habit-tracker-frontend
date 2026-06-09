import '_vars.just'
import 'dev.just'

# Launch production environment
prod: env-prod-check
    {{COMPOSE_PROD}} up -d --build

# Show production logs
prod-logs:
    {{COMPOSE_PROD}} logs -f

# Stop production environment
prod-down:
    {{COMPOSE_PROD}} down

# Apply prod migrations (in-container) + realign app_runtime role password (mig 0013 sets a placeholder via IF NOT EXISTS → pool can't auth until ALTER ROLE matches APP_RUNTIME_PASSWORD). Idempotent, safe to re-run.
prod-migrate:
    #!/usr/bin/env bash
    set -euo pipefail
    printf "{{RED}}⚠ PROD MIGRATE — tape 'PROD' pour confirmer{{NC}}\n"
    read -r -p "> " C
    [ "$C" = "PROD" ] || { printf "{{RED}}abandon{{NC}}\n"; exit 1; }
    {{COMPOSE_PROD}} exec -T api sh -c "cd backend && bun run src/db/migrate.ts"
    APP_PW=$(grep -E '^APP_RUNTIME_PASSWORD=' .env.prod 2>/dev/null | cut -d= -f2- || true)
    [ -n "$APP_PW" ] || { printf "{{RED}}APP_RUNTIME_PASSWORD absent de .env.prod — ALTER ROLE non appliqué{{NC}}\n"; exit 1; }
    {{COMPOSE_PROD}} exec -T db psql -U app -d appdb -c "ALTER ROLE app_runtime PASSWORD '$APP_PW';"
    printf "{{GREEN}}✓ app_runtime password aligné{{NC}}\n"

# Reload Nginx config without downtime
nginx-reload:
    {{COMPOSE_PROD}} exec nginx nginx -s reload

# Stop all containers
stop:
    {{COMPOSE_DEV}} down 2>/dev/null || true
    {{COMPOSE_PROD}} down 2>/dev/null || true
    {{COMPOSE_TEST}} down 2>/dev/null || true
    {{COMPOSE_E2E}} down 2>/dev/null || true

# Restart dev environment
restart: dev-down dev

# Show container status
ps:
    {{COMPOSE_DEV}} ps

# Show all logs
logs:
    {{COMPOSE_DEV}} logs -f

# API logs
logs-api:
    {{COMPOSE_DEV}} logs -f api

# Database logs
logs-db:
    {{COMPOSE_DEV}} logs -f db

# Nginx logs
logs-nginx:
    {{COMPOSE_DEV}} logs -f nginx

# Frontend logs
logs-frontend:
    {{COMPOSE_DEV}} logs -f frontend

# Shell into API container
shell-api:
    {{COMPOSE_DEV}} exec api /bin/sh

# psql into DB container
shell-db:
    {{COMPOSE_DEV}} exec db psql -U app -d appdb

# Shell into frontend container
shell-frontend:
    {{COMPOSE_DEV}} exec frontend /bin/sh

# Generate SSL certificates. Usage: just ssl-init <domain> <email>
ssl-init domain email:
    #!/usr/bin/env bash
    printf '\033[0;33m⚠ Cert request: {{domain}} <{{email}}>\033[0m\n'
    read -p "Continue? [y/N] " confirm && [ "$confirm" = "y" ] || exit 1
    {{COMPOSE_PROD}} exec certbot \
        certbot certonly --webroot -w /var/www/certbot \
        -d {{domain}} \
        --email {{email}} \
        --agree-tos \
        --no-eff-email

# Renew SSL certificates and reload nginx
ssl-renew:
    {{COMPOSE_PROD}} exec certbot certbot renew
    {{COMPOSE_PROD}} exec nginx nginx -s reload

# Configure ufw: allow SSH/HTTP/HTTPS, block everything else
firewall-setup:
    #!/usr/bin/env bash
    printf '\033[0;33m⚠ SSH (port 22) will be allowed first — do not interrupt\033[0m\n'
    read -p "Continue? [y/N] " confirm && [ "$confirm" = "y" ] || exit 1
    ufw allow OpenSSH
    ufw allow 80/tcp
    ufw allow 443/tcp
    ufw --force enable
    ufw status verbose

# Show firewall status
firewall-status:
    ufw status verbose

# Remove containers, volumes and images
clean:
    #!/usr/bin/env bash
    printf '\033[0;33m⚠ This will delete all Docker data\033[0m\n'
    read -p "Continue? [y/N] " confirm && [ "$confirm" = "y" ] || exit 1
    {{COMPOSE_DEV}} down -v 2>/dev/null || true
    {{COMPOSE_PROD}} down -v 2>/dev/null || true
    {{COMPOSE_TEST}} down -v 2>/dev/null || true
    docker system prune -af --volumes

# Remove containers (keep volumes)
clean-soft:
    {{COMPOSE_DEV}} down 2>/dev/null || true
    {{COMPOSE_PROD}} down 2>/dev/null || true
    {{COMPOSE_TEST}} down 2>/dev/null || true
    {{COMPOSE_E2E}} down 2>/dev/null || true
    just ts-clean

# Remove project images (force rebuild)
clean-images:
    {{COMPOSE_DEV}} down 2>/dev/null || true
    docker rmi aurore-frontend aurore-api 2>/dev/null || true
    @printf "{{GREEN}}✓ Images removed.{{NC}}\n"

# Check service health
health:
    @printf "{{GREEN}}Service status:{{NC}}\n"
    {{COMPOSE_DEV}} ps --format "table {{{{.Name}}}}\t{{{{.Status}}}}\t{{{{.Health}}}}"

# Show container resource stats
stats:
    docker stats --no-stream

# Check both .env files present (deploy verification)
env-check:
    @test -f .env.dev  || (printf "{{YELLOW}}Warning: .env.dev missing{{NC}}\n"  && exit 1)
    @test -f .env.prod || (printf "{{YELLOW}}Warning: .env.prod missing{{NC}}\n" && exit 1)

# Check .env.prod present (gate for `prod` — a prod host has no .env.dev)
env-prod-check:
    @test -f .env.prod || (printf "{{YELLOW}}Warning: .env.prod missing{{NC}}\n" && exit 1)

# Radical clean: wipe node_modules (Docker root-owned) + reinstall. Keeps bun.lock (reproducible).
clean-install:
    docker run --rm -v $PWD:/app -w /app alpine sh -c "rm -rf node_modules backend/node_modules frontend/node_modules shared/node_modules"
    bun install --no-cache

# Build Docker images
build:
    {{COMPOSE_PROD}} build

# Render resolved compose config (merged overlays + interpolated env). TARGET: dev|prod.
compose-config TARGET="dev":
    @{{ if TARGET == "prod" { COMPOSE_PROD } else { COMPOSE_DEV } }} config

# Diagnose type and Docker issues
diagnose:
    #!/usr/bin/env bash
    printf '\033[0;36m=== Generated types check ===\033[0m\n'
    test -f shared/dist/index.d.ts  && printf '\033[0;32m✓ shared/dist/index.d.ts\033[0m\n'  || printf '\033[0;31m✗ shared/dist/index.d.ts missing\033[0m\n'
    test -f backend/dist/index.d.ts && printf '\033[0;32m✓ backend/dist/index.d.ts\033[0m\n' || printf '\033[0;31m✗ backend/dist/index.d.ts missing\033[0m\n'
    printf '\n\033[0;36m=== Docker check ===\033[0m\n'
    {{COMPOSE_DEV}} ps 2>/dev/null || printf '\033[0;33mDocker compose not active\033[0m\n'
    printf '\n\033[0;36m=== Docker volumes ===\033[0m\n'
    docker volume ls | grep aurore || printf '\033[0;33mNo aurore volumes\033[0m\n'
