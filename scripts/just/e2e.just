import '_vars.just'
import 'dev.just'

# Launch E2E stack (tmpfs DB + migrate + seed) and wait for frontend.
# Ports isolés (5174/3001/5434) — tourne en parallèle avec just dev.
e2e-up: ts-build
    {{COMPOSE_E2E}} up -d --build
    @printf "{{CYAN}}Waiting for DB...{{NC}}\n"
    @until {{COMPOSE_E2E}} exec -T db pg_isready -U app -d appdb >/dev/null 2>&1; do sleep 1; done
    @printf "{{CYAN}}Migrations...{{NC}}\n"
    {{COMPOSE_E2E}} exec -T api bun run src/db/migrate.ts
    @printf "{{CYAN}}Seed CORE...{{NC}}\n"
    {{COMPOSE_E2E}} exec -T api bun run src/db/seed/seeders/seed-core.ts --reset
    @printf "{{CYAN}}Waiting for frontend...{{NC}}\n"
    @until curl -sf http://localhost:5174 >/dev/null; do sleep 1; done
    @printf "{{GREEN}}✓ E2E stack ready on http://localhost:5174{{NC}}\n"

# Stop E2E stack (tmpfs DB lost)
e2e-down:
    {{COMPOSE_E2E}} down

# Recreate E2E stack from scratch
e2e-reset: e2e-down e2e-up

# E2E stack logs
e2e-logs:
    {{COMPOSE_E2E}} logs -f

# Run Playwright — lance just e2e-up automatiquement si la stack n'est pas déjà up
e2e:
    cd frontend && bunx playwright test

# Run Playwright in interactive UI mode
e2e-ui:
    cd frontend && bunx playwright test --ui
