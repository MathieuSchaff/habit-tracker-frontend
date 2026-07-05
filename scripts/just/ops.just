import '_vars.just'
import 'dev.just'

# Launch production environment
prod: env-prod-check
    {{COMPOSE_PROD}} up -d --build

# Show production logs
prod-logs:
    {{COMPOSE_PROD}} logs -f

# Apply prod migrations (in-container) + realign app_runtime role password (mig 0013 sets a placeholder via IF NOT EXISTS → pool can't auth until ALTER ROLE matches APP_RUNTIME_PASSWORD). Idempotent, safe to re-run.
prod-migrate:
    #!/usr/bin/env bash
    set -euo pipefail
    source {{justfile_directory()}}/scripts/just/_lib.sh
    # SKIP_CONFIRM=1 lets `deploy` gate once instead of prompting twice.
    if [ "${SKIP_CONFIRM:-}" != "1" ]; then confirm_prod "MIGRATE"; fi
    {{COMPOSE_PROD}} exec -T -w /app/backend api bun run src/db/migrate.ts
    APP_PW=$(grep -E '^APP_RUNTIME_PASSWORD=' .env.prod 2>/dev/null | cut -d= -f2- || true)
    [ -n "$APP_PW" ] || { printf "{{RED}}APP_RUNTIME_PASSWORD absent de .env.prod — ALTER ROLE non appliqué{{NC}}\n"; exit 1; }
    {{COMPOSE_PROD}} exec -T db psql -U app -d appdb -c "ALTER ROLE app_runtime PASSWORD '$APP_PW';"
    printf "{{GREEN}}✓ app_runtime password aligné{{NC}}\n"

# Reload Nginx config without downtime
nginx-reload:
    {{COMPOSE_PROD}} exec nginx nginx -s reload

# Prod container health snapshot (mirrors `health`, prod stack).
prod-health:
    {{COMPOSE_PROD}} ps --format "table {{{{.Name}}\t{{{{.Status}}\t{{{{.Health}}"

# One-shot prod deploy (run ON the VPS): sync config → pull images → up → migrate → health.
deploy: env-prod-check
    #!/usr/bin/env bash
    set -euo pipefail
    source {{justfile_directory()}}/scripts/just/_lib.sh
    # Single 'DEPLOY' gate skips prod-migrate's own prompt. Migrate execs inside the
    # api container so it runs after `up`; additive migrations boot fine on the old
    # schema — a breaking one needs `just prod-migrate` once the new image is up.
    confirm_prod "DEPLOY" "DEPLOY"
    # Config only (compose, nginx, migration SQL) — code now ships as a pre-built image.
    # Mirror, not pull: GitHub rewrites main's history on each PR merge, so a deploy
    # target is never fast-forwardable. reset --hard keeps untracked .env.prod/backups.
    printf "{{CYAN}}▸ sync config to origin/main{{NC}}\n"
    git fetch origin
    git reset --hard origin/main
    # Pull images CI built for THIS commit. 'manifest unknown' = build-push not done yet;
    # wait for the Actions run to go green before deploying.
    export IMAGE_TAG=$(git rev-parse HEAD)
    printf "{{CYAN}}▸ pull images %s{{NC}}\n" "$IMAGE_TAG"
    {{COMPOSE_PROD}} pull api frontend
    printf "{{CYAN}}▸ up (no build){{NC}}\n"
    {{COMPOSE_PROD}} up -d
    printf "{{CYAN}}▸ wait api{{NC}}\n"
    for _ in $(seq 1 20); do
        {{COMPOSE_PROD}} exec -T api true 2>/dev/null && break
        sleep 2
    done
    printf "{{CYAN}}▸ migrate (prod){{NC}}\n"
    SKIP_CONFIRM=1 just prod-migrate
    printf "{{CYAN}}▸ health{{NC}}\n"
    just prod-health
    printf "{{GREEN}}✓ Deploy done{{NC}}\n"

# Run any cmd on the VPS in the repo (bash -lc loads login PATH). Usage: just prod-ssh 'docker ps'
prod-ssh +CMD:
    ssh -t aurore "bash -lc 'cd ~/aurore && {{CMD}}'"

# Trigger a full prod deploy on the VPS from the laptop.
prod-deploy:
    ssh -t aurore "bash -lc 'cd ~/aurore && just deploy'"

# ─── Prod observability (laptop → VPS over ssh; raw docker, no local stack) ───

# Prod container status + health at a glance.
prod-ps:
    ssh aurore 'docker ps --filter name=app_ --format "table {{{{.Names}}\t{{{{.Status}}"'

# Tail a prod service log, pino-pretty-formatted. Usage: just prod-tail [api|db|nginx|frontend] [lines]
prod-tail svc="api" n="200":
    ssh aurore 'docker logs app_{{svc}} --tail {{n}} 2>&1' | node_modules/.bin/pino-pretty -c -t -i pid,hostname

# Interactive psql on prod (read/write — careful). Read-only browse: SET ROLE dev_readonly.
prod-psql:
    ssh -t aurore 'docker exec -it app_db psql -U app -d appdb'

# Read-only prod psql: opens as dev_readonly (SELECT-only). RESET ROLE to regain write.
prod-psql-ro:
    ssh -t aurore 'docker exec -it -e PGOPTIONS="-c role=dev_readonly" app_db psql -U app -d appdb'

# Apply a staged one-shot SQL fix from .db-fixes/ (gitignored). Atomic: -1 + ON_ERROR_STOP.
# Dev keeps the file so you can review, then re-run with TARGET=prod. Prod runs over ssh
# then archives the file to .db-fixes/applied/ so it can never be replayed by accident.
# Usage: just db-fix .db-fixes/xxx.sql   →   TARGET=prod just db-fix .db-fixes/xxx.sql
db-fix file:
    #!/usr/bin/env bash
    set -euo pipefail
    source {{justfile_directory()}}/scripts/just/_lib.sh
    [ -f "{{file}}" ] || { printf "{{RED}}❌ no file: {{file}}{{NC}}\n"; exit 1; }
    TARGET="${TARGET:-dev}"
    if [ "$TARGET" = "prod" ]; then
        confirm_prod "DATA FIX from {{file}}"
        ssh aurore 'docker exec -i app_db psql -U app -d appdb -1 -v ON_ERROR_STOP=1' < "{{file}}"
        DIR="$(dirname "{{file}}")/applied"
        mkdir -p "$DIR"
        DEST="$DIR/$(basename "{{file}}" .sql).$(date +%Y%m%d_%H%M%S).sql"
        mv "{{file}}" "$DEST"
        printf "{{GREEN}}✓ Applied on prod + archived → $DEST{{NC}}\n"
    else
        {{COMPOSE_DEV}} exec -T db psql -U app -d appdb -1 -v ON_ERROR_STOP=1 < "{{file}}"
        printf "{{GREEN}}✓ Applied on dev (file kept). Review, then: TARGET=prod just db-fix {{file}}{{NC}}\n"
    fi

# Recent security events (input-guard injection/XSS hits), last 30 days. Read-only via dev_readonly.
prod-security:
    ssh aurore 'docker exec -e PGOPTIONS="-c role=dev_readonly" app_db psql -U app -d appdb -P pager=off -c "SELECT created_at, severity, event_type, field, route, left(payload,60) AS payload FROM security_events WHERE created_at > current_date - 30 ORDER BY created_at DESC LIMIT 20;"'

# Delete demo accounts past their 24h TTL (cron entrypoint). TARGET: dev|prod.
sweep-demos:
    #!/usr/bin/env bash
    set -euo pipefail
    source {{justfile_directory()}}/scripts/just/_lib.sh
    TARGET="${TARGET:-dev}"
    target_compose
    printf "{{CYAN}}Sweeping expired demo accounts ($TARGET)...{{NC}}\n"
    $COMPOSE exec -w /app/backend api bun run src/features/auth/sweep-expired-demos.cli.ts

# [PROD] Install daily cron (4am) to purge expired demo accounts. Shares backup-cron's PATH assumption (just on root PATH).
demo-sweep-cron-install:
    #!/usr/bin/env bash
    printf "{{YELLOW}}Installing demo-sweep cron at /etc/cron.d/aurore-demo-sweep{{NC}}\n"
    echo "0 4 * * * root cd $(pwd) && TARGET=prod just sweep-demos >> /var/log/aurore-demo-sweep.log 2>&1" \
        | sudo tee /etc/cron.d/aurore-demo-sweep > /dev/null
    sudo chmod 644 /etc/cron.d/aurore-demo-sweep
    printf "{{GREEN}}✓ Cron installed — daily demo sweep at 4am{{NC}}\n"

# Stop all containers
stop:
    {{COMPOSE_DEV}} down 2>/dev/null || true
    {{COMPOSE_PROD}} down 2>/dev/null || true
    {{COMPOSE_TEST}} down 2>/dev/null || true
    {{COMPOSE_E2E}} down 2>/dev/null || true

# Shell into API container
shell-api:
    {{COMPOSE_DEV}} exec api /bin/sh

# psql into DB container
shell-db:
    {{COMPOSE_DEV}} exec db psql -U app -d appdb

# Generate SSL certificates for the apex + www hostnames. Usage: just ssl-init <domain> <email>
ssl-init domain email:
    #!/usr/bin/env bash
    set -euo pipefail
    DOMAIN="{{domain}}"
    PRIMARY="${DOMAIN#www.}"
    WWW="www.${PRIMARY}"
    printf '\033[0;33m⚠ Cert request: %s + %s <%s>\033[0m\n' "$PRIMARY" "$WWW" "{{email}}"
    read -p "Continue? [y/N] " confirm && [ "$confirm" = "y" ] || exit 1
    {{COMPOSE_PROD}} exec certbot \
        certbot certonly --webroot -w /var/www/certbot \
        --cert-name "$PRIMARY" \
        --expand \
        -d "$PRIMARY" \
        -d "$WWW" \
        --email {{email}} \
        --agree-tos \
        --no-eff-email

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

# Check .env.prod present (gate for `prod` — a prod host has no .env.dev)
env-prod-check:
    @test -f .env.prod || (printf "{{YELLOW}}Warning: .env.prod missing{{NC}}\n" && exit 1)

# Radical clean: wipe node_modules (Docker root-owned) + reinstall. Keeps bun.lock (reproducible).
clean-install:
    docker run --rm -v $PWD:/app -w /app alpine sh -c "rm -rf node_modules backend/node_modules frontend/node_modules shared/node_modules"
    bun install --no-cache
