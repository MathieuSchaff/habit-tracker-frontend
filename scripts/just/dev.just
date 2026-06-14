import '_vars.just'

ALGO_DERM_DIR := "../algo-derm"

# Launch dev environment after host-side TypeScript preflight
dev: ts-build _db-guard
    {{COMPOSE_DEV}} up --build

# Stop dev environment
dev-down:
    {{COMPOSE_DEV}} down

# Launch dev in background after host-side TypeScript preflight
dev-d: ts-build _db-guard
    {{COMPOSE_DEV}} up -d --build

# Fail-safe: bring db up first and offer a snapshot restore if the dev DB is
# empty. A volume wipe (just clean / down -v / prune) otherwise leaves the stack
# silently 500ing — `just dev` boots fine but every query hits a schemaless DB.
_db-guard:
    #!/usr/bin/env bash
    set -euo pipefail
    {{COMPOSE_DEV}} up -d db
    for _ in $(seq 1 30); do
        {{COMPOSE_DEV}} exec -T db pg_isready -U app -d appdb >/dev/null 2>&1 && break
        sleep 1
    done
    COUNT=$({{COMPOSE_DEV}} exec -T db psql -U app -d appdb -tAc "SELECT count(*) FROM products" 2>/dev/null | tr -dc '0-9')
    if [ -n "$COUNT" ] && [ "$COUNT" -gt 0 ]; then exit 0; fi
    printf "{{RED}}⚠ DB dev vide (products absente ou 0 ligne) — volume wipé ?{{NC}}\n"
    printf "{{YELLOW}}  Restore manuel : just db-migrate && just db-snapshot-load{{NC}}\n"
    if [ ! -t 0 ]; then
        printf "{{YELLOW}}  (non-interactif → boot continue avec une DB vide){{NC}}\n"
        exit 0
    fi
    read -r -p "Restaurer depuis snapshot/data.sql maintenant ? [y/N] " C
    [ "$C" = "y" ] || exit 0
    just db-migrate
    just db-snapshot-load
    # mig 0013 creates app_runtime with a placeholder password; realign with .env.dev so the pool can auth
    set -a; source .env.dev; set +a
    {{COMPOSE_DEV}} exec -T db psql -U app -d appdb -c "ALTER ROLE app_runtime PASSWORD '${APP_RUNTIME_PASSWORD}'" >/dev/null
    printf "{{GREEN}}✓ DB restaurée depuis snapshot{{NC}}\n"

# Prod-like profiling: Caddy HTTP/2 + brotli + immutable over prod build, /api → backend (closest local match to prod nginx). Needs backend up (`just dev-d`); open https://localhost:8443, accept self-signed warning.
profile-prod:
    cd frontend && bun run build
    docker run --rm -p 8443:8443 \
        --add-host host.docker.internal:host-gateway \
        -v {{justfile_directory()}}/frontend/dist:/srv:ro \
        -v {{justfile_directory()}}/infra/caddy/Caddyfile:/etc/caddy/Caddyfile:ro \
        caddy:latest

# Full clean + install + types + docker (preserves pgdata)
dev-fresh: ts-clean install-deps ts-build
    {{COMPOSE_DEV}} down 2>/dev/null || true
    just _db-guard
    {{COMPOSE_DEV}} up --build

# Full rebuild without cache (after adding dependencies)
dev-rebuild: ts-build
    {{COMPOSE_DEV}} down
    {{COMPOSE_DEV}} build --no-cache
    just _db-guard
    {{COMPOSE_DEV}} up

# First-time setup: deps + hooks + env template
init: install-deps setup-hooks
    @if [ ! -f .env.dev ]; then \
        cp .env.example .env.dev; \
        printf "{{YELLOW}}→ .env.dev created — fill in secrets before running 'just dev'{{NC}}\n"; \
    else \
        printf "{{CYAN}}→ .env.dev already exists, skipping{{NC}}\n"; \
    fi
    @printf "{{GREEN}}✓ Project ready. Next: fill .env.dev then run 'just dev'{{NC}}\n"

# Install git hooks (run once after clone)
setup-hooks:
    mise exec -- lefthook install
    @printf "{{GREEN}}✓ Git hooks installed{{NC}}\n"

# Install deps from root (host)
install-deps:
    @printf "{{CYAN}}Installing monorepo dependencies...{{NC}}\n"
    bun install
    @printf "{{GREEN}}✓ Dependencies installed{{NC}}\n"

# Rebuild algo-derm tarball in vendor/ from a pinned ref + bun install --force.
# Aurore is calibrated for a fixed TAG_DEFS_VERSION (passes/algo-derm-detection.ts);
# algo-derm main has moved ahead, so we build from a pinned ref in a throwaway
# worktree (never the working checkout) and refuse a version mismatch. Migrate with
# ALGO_DERM_REF=main once CALIBRATED_FOR_TAG_DEFS_VERSION is bumped.
vendor-algo-derm:
    #!/usr/bin/env bash
    set -euo pipefail
    REF="${ALGO_DERM_REF:-v17-aurore}"
    printf "{{CYAN}}Build algo-derm @ %s...{{NC}}\n" "$REF"
    WT="$(mktemp -d)"
    trap 'git -C {{ALGO_DERM_DIR}} worktree remove --force "$WT" >/dev/null 2>&1 || true' EXIT
    git -C {{ALGO_DERM_DIR}} worktree add --quiet "$WT" "$REF"
    ( cd "$WT" && npm ci --silent && npm run build:inci-aliases && npm run build )
    mkdir -p vendor
    rm -f vendor/algo-derm.tgz vendor/algo-derm-*.tgz
    ( cd "$WT" && npm pack --pack-destination {{justfile_directory()}}/vendor >/dev/null )
    mv vendor/algo-derm-*.tgz vendor/algo-derm.tgz
    # Refuse a build whose TAG_DEFS_VERSION differs from what Aurore is calibrated for.
    want="$(grep -oE 'CALIBRATED_FOR_TAG_DEFS_VERSION = [0-9]+' backend/src/features/auto-tagging/passes/algo-derm-detection.ts | grep -oE '[0-9]+$')"
    got="$(tar -xzOf vendor/algo-derm.tgz package/dist/engine/tags/index.js | grep -oE 'TAG_DEFS_VERSION = [0-9]+' | grep -oE '[0-9]+$' | head -1)"
    if [ "$got" != "$want" ]; then
        printf "{{RED}}refusing: built TAG_DEFS_VERSION=%s but Aurore is calibrated for %s — re-run audits + bump CALIBRATED_FOR first.{{NC}}\n" "$got" "$want"
        exit 1
    fi
    printf "{{GREEN}}✓ vendor/algo-derm.tgz updated (TAG_DEFS v%s, ref %s){{NC}}\n" "$got" "$REF"
    # Regen bun.lock integrity for the rebuilt tarball; else `bun install --force`
    # fails the integrity check (the hash is keyed to the tarball bytes).
    export newint="sha512-$(openssl dgst -sha512 -binary vendor/algo-derm.tgz | openssl base64 -A)"
    perl -i -pe 's{(\Q"algo-derm": ["algo-derm@../vendor/algo-derm.tgz", {}, "\E)sha512-[^"]+}{$1 . $ENV{newint}}e' bun.lock
    # bun keys the file: tarball extraction once and reuses it on --force; purge the
    # cache entry + its @T@ target so host node_modules (and host tsc -b) get the rebuild.
    for l in "${BUN_INSTALL:-$HOME/.bun}"/install/cache/algo-derm/*; do rm -rf "$(readlink -f "$l")"; done
    rm -rf "${BUN_INSTALL:-$HOME/.bun}/install/cache/algo-derm" node_modules/algo-derm
    bun install --force
    printf "{{GREEN}}✓ Deps reinstalled (algo-derm@%s from tarball, host cache purged){{NC}}\n" "$REF"

# Full backend rebuild (volumes + image)
reinstall-backend:
    {{COMPOSE_DEV}} down
    {{COMPOSE_DEV}} build --no-cache api
    {{COMPOSE_DEV}} up -d
    @printf "{{GREEN}}✓ Backend reinstalled{{NC}}\n"

# Full frontend rebuild (volumes + image)
reinstall-frontend:
    {{COMPOSE_DEV}} down
    {{COMPOSE_DEV}} build --no-cache frontend
    {{COMPOSE_DEV}} up -d
    @printf "{{GREEN}}✓ Frontend reinstalled{{NC}}\n"

# Watch TypeScript (generates types for editor)
ts-check:
    bunx tsc -b --watch

# Host-side preflight: TanStack routes + TypeScript project check
ts-build:
    @printf "{{CYAN}}Generating TanStack routes...{{NC}}\n"
    cd frontend && bunx @tanstack/router-cli generate
    @printf "{{CYAN}}TypeScript global check...{{NC}}\n"
    bunx tsc -b

# Verify types without watch (end of session, incremental). Solution graph includes backend tests.
ts-verify:
    bunx tsc -b

# Remove all dist/ and TS caches
ts-clean:
    @printf "{{YELLOW}}Cleaning types...{{NC}}\n"
    rm -rf shared/dist backend/dist frontend/dist
    find . -name "*.tsbuildinfo" -delete
    find . -name ".turbo" -type d -exec rm -rf {} + 2>/dev/null || true
    @printf "{{GREEN}}✓ Types cleaned{{NC}}\n"
