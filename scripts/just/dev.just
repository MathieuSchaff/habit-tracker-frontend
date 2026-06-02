import '_vars.just'

ALGO_DERM_DIR := "../algo-derm"

# Launch dev environment after host-side TypeScript preflight
dev: ts-build
    {{COMPOSE_DEV}} up --build

# Stop dev environment
dev-down:
    {{COMPOSE_DEV}} down

# Launch dev in background after host-side TypeScript preflight
dev-d: ts-build
    {{COMPOSE_DEV}} up -d --build

# Full clean + install + types + docker (preserves pgdata)
dev-fresh: ts-clean install-deps ts-build
    {{COMPOSE_DEV}} down 2>/dev/null || true
    {{COMPOSE_DEV}} up --build

# Full rebuild without cache (after adding dependencies)
dev-rebuild: ts-build
    {{COMPOSE_DEV}} down
    {{COMPOSE_DEV}} build --no-cache
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

# Rebuild algo-derm tarball in vendor/ + bun install --force
vendor-algo-derm:
    @printf "{{CYAN}}Build algo-derm...{{NC}}\n"
    cd {{ALGO_DERM_DIR}} && npm run build
    mkdir -p vendor
    rm -f vendor/algo-derm.tgz vendor/algo-derm-*.tgz
    cd {{ALGO_DERM_DIR}} && npm pack --pack-destination {{justfile_directory()}}/vendor >/dev/null
    mv vendor/algo-derm-*.tgz vendor/algo-derm.tgz
    @printf "{{GREEN}}✓ vendor/algo-derm.tgz updated{{NC}}\n"
    bun install --force
    @printf "{{GREEN}}✓ Deps reinstalled (algo-derm from tarball){{NC}}\n"

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

# Verify types without watch (end of session, incremental)
ts-verify:
    bunx tsc -b
    @printf "{{CYAN}}Typechecking backend tests...{{NC}}\n"
    bunx tsc -p backend/tsconfig.test.json

# Remove all dist/ and TS caches
ts-clean:
    @printf "{{YELLOW}}Cleaning types...{{NC}}\n"
    rm -rf shared/dist backend/dist frontend/dist
    find . -name "*.tsbuildinfo" -delete
    find . -name ".turbo" -type d -exec rm -rf {} + 2>/dev/null || true
    @printf "{{GREEN}}✓ Types cleaned{{NC}}\n"
