import '_vars.just'

TEST_DB_URL     := "postgres://app:testpassword@localhost:5433/appdb_test"
APP_TEST_DB_URL := "postgres://app_runtime:testpassword@localhost:5433/appdb_test"

# Naming convention:
#   no "-dev" suffix → recipe brings the test DB up first (safe, slower).
#   "-dev" suffix    → recipe assumes the DB is already up (fast inner loop).
#   args=""          → optional filter passed to `bun test` (e.g. `just test-backend auth`).

# ─────────────────────────── DB lifecycle ───────────────────────────

# Start test DB and apply migrations
test-db-up:
    {{COMPOSE_TEST}} down --remove-orphans 2>/dev/null || true
    {{COMPOSE_TEST}} up -d
    @printf "{{CYAN}}Waiting for DB...{{NC}}\n"
    @until {{COMPOSE_TEST}} exec db-test pg_isready -U app -d appdb_test 2>/dev/null; do sleep 1; done
    @printf "{{CYAN}}Applying migrations...{{NC}}\n"
    cd backend && DATABASE_URL={{TEST_DB_URL}} APP_DATABASE_URL={{APP_TEST_DB_URL}} bun run src/db/migrate.ts
    @printf "{{GREEN}}✓ Test DB ready{{NC}}\n"

# Stop test DB
test-db-down:
    {{COMPOSE_TEST}} down

# Seed CORE into test DB — requires test-db-up
test-db-seed:
    @printf "{{CYAN}}Seeding CORE into test DB...{{NC}}\n"
    cd backend && export $(grep -v '^\#' ../.env.dev | xargs) && DATABASE_URL={{TEST_DB_URL}} APP_DATABASE_URL={{APP_TEST_DB_URL}} bun run src/db/seed/seeders/seed-core.ts --reset
    @printf "{{GREEN}}✓ CORE seed done on test DB{{NC}}\n"

# ─────────────────────────── Run once ───────────────────────────

# Run ALL tests — shared (pure) + backend (full cycle) + frontend
test: test-shared test-backend test-frontend

# Run shared unit tests — pure, no DB, optional filter
test-shared args="":
    cd shared && bun test {{args}}
    @printf "{{GREEN}}✓ Shared tests done{{NC}}\n"

# Run backend tests — brings DB up, optional filter
test-backend args="": test-db-up
    DATABASE_URL={{TEST_DB_URL}} APP_DATABASE_URL={{APP_TEST_DB_URL}} bun --cwd ./backend test {{args}}
    @printf "{{GREEN}}✓ Backend tests done{{NC}}\n"

# Run frontend tests
test-frontend:
    cd frontend && bunx vitest run
    @printf "{{GREEN}}✓ Frontend tests done{{NC}}\n"

# Run backend tests — DB assumed up, optional filter — fast inner loop
test-dev args="":
    cd backend && DATABASE_URL={{TEST_DB_URL}} APP_DATABASE_URL={{APP_TEST_DB_URL}} bun test {{args}}

# ─────────────────────────── Watch ───────────────────────────

# Watch backend tests — brings DB up first
test-watch: test-db-up
    cd backend && DATABASE_URL={{TEST_DB_URL}} APP_DATABASE_URL={{APP_TEST_DB_URL}} bun test --watch

# Watch backend tests — DB assumed up, optional filter
test-dev-watch args="":
    cd backend && DATABASE_URL={{TEST_DB_URL}} APP_DATABASE_URL={{APP_TEST_DB_URL}} bun test --watch {{args}}

# ──────────────────── Coverage (feeds fallow health --coverage) ────────────────────

# Backend coverage (lcov) → backend/coverage/
test-backend-coverage args="": test-db-up
    DATABASE_URL={{TEST_DB_URL}} APP_DATABASE_URL={{APP_TEST_DB_URL}} bun --cwd ./backend test --coverage --coverage-reporter=lcov --coverage-reporter=text --coverage-dir=./coverage {{args}}
    @printf "{{GREEN}}✓ Backend coverage written to backend/coverage/{{NC}}\n"

# Frontend coverage (lcov) → frontend/coverage/
test-frontend-coverage:
    cd frontend && bunx vitest run --coverage
    @printf "{{GREEN}}✓ Frontend coverage written to frontend/coverage/{{NC}}\n"

# ──────────────── Perf regression guard (baseline cleanDatabase = 903, must not rise) ────────────────

# Bench backend suite — captures wall-time + full log to /tmp/aurore-backend-test.log
test-bench: test-db-up
    @printf "{{CYAN}}Benching backend tests (output → /tmp/aurore-backend-test.log)...{{NC}}\n"
    cd backend && /usr/bin/time -f "wall=%es cpu=%P max-rss=%MKB" -o /tmp/aurore-backend-test.time \
        env DATABASE_URL={{TEST_DB_URL}} APP_DATABASE_URL={{APP_TEST_DB_URL}} \
        bun test 2>&1 | tee /tmp/aurore-backend-test.log
    @printf "{{GREEN}}--- timing ---{{NC}}\n"
    @cat /tmp/aurore-backend-test.time
    @printf "{{CYAN}}cleanDatabase fires (baseline 903):{{NC}} "
    @grep -c "Cleaning database" /tmp/aurore-backend-test.log

# Re-read cleanDatabase fires from the last test-bench log (no re-bench)
test-clean-count:
    @if [ ! -f /tmp/aurore-backend-test.log ]; then \
        printf "{{CYAN}}No log yet — run 'just test-bench' first.{{NC}}\n"; \
        exit 1; \
    fi
    @printf "{{CYAN}}cleanDatabase fires in last run:{{NC}} "
    @grep -c "Cleaning database" /tmp/aurore-backend-test.log
