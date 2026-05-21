import '_vars.just'

TEST_DB_URL     := "postgres://app:testpassword@localhost:5433/appdb_test"
APP_TEST_DB_URL := "postgres://app_runtime:testpassword@localhost:5433/appdb_test"

# Start test DB and apply migrations
test-db-up:
    {{COMPOSE_TEST}} down --remove-orphans 2>/dev/null || true
    docker rm -f app_db_test 2>/dev/null || true
    {{COMPOSE_TEST}} up -d
    @printf "{{CYAN}}Waiting for DB...{{NC}}\n"
    @until {{COMPOSE_TEST}} exec db-test pg_isready -U app -d appdb_test 2>/dev/null; do sleep 1; done
    @printf "{{CYAN}}Applying migrations...{{NC}}\n"
    cd backend && DATABASE_URL={{TEST_DB_URL}} APP_DATABASE_URL={{APP_TEST_DB_URL}} bun run src/db/migrate.ts
    @printf "{{GREEN}}✓ Test DB ready{{NC}}\n"

# Stop test DB
test-db-down:
    {{COMPOSE_TEST}} down

# Reset test DB from scratch
test-db-reset: test-db-down test-db-up

# Run ALL tests — backend (full cycle) + frontend
test: test-backend test-frontend

# Run backend tests — full cycle with DB setup (optional pattern)
test-backend args="": test-db-up
    DATABASE_URL={{TEST_DB_URL}} APP_DATABASE_URL={{APP_TEST_DB_URL}} bun --cwd ./backend test {{args}}
    @printf "{{GREEN}}✓ Backend tests done{{NC}}\n"

# Run backend tests with coverage (lcov) — feeds fallow health --coverage
test-backend-coverage args="": test-db-up
    DATABASE_URL={{TEST_DB_URL}} APP_DATABASE_URL={{APP_TEST_DB_URL}} bun --cwd ./backend test --coverage --coverage-reporter=lcov --coverage-reporter=text --coverage-dir=./coverage {{args}}
    @printf "{{GREEN}}✓ Backend coverage written to backend/coverage/{{NC}}\n"

# Run frontend tests
test-frontend:
    cd frontend && bunx vitest run
    @printf "{{GREEN}}✓ Frontend tests done{{NC}}\n"

# Run frontend tests with coverage (lcov) — feeds fallow health --coverage
test-frontend-coverage:
    cd frontend && bunx vitest run --coverage
    @printf "{{GREEN}}✓ Frontend coverage written to frontend/coverage/{{NC}}\n"

# Run backend tests without restarting DB — fast dev loop (optional pattern)
test-dev args="":
    cd backend && DATABASE_URL={{TEST_DB_URL}} APP_DATABASE_URL={{APP_TEST_DB_URL}} bun test {{args}}

# Watch backend tests (requires test-db-up)
test-dev-watch args="":
    cd backend && DATABASE_URL={{TEST_DB_URL}} APP_DATABASE_URL={{APP_TEST_DB_URL}} bun test --watch {{args}}

# Watch backend tests with auto DB setup
test-watch: test-db-up
    cd backend && DATABASE_URL={{TEST_DB_URL}} APP_DATABASE_URL={{APP_TEST_DB_URL}} bun test --watch

# Watch frontend tests
test-frontend-watch:
    cd frontend && bunx vitest

# Launch Vitest with web UI
test-frontend-ui:
    cd frontend && bunx vitest --ui

# Run specific backend tests — pattern required
test-only pattern: test-db-up
    cd backend && DATABASE_URL={{TEST_DB_URL}} APP_DATABASE_URL={{APP_TEST_DB_URL}} bun test "{{pattern}}"

# Launch Drizzle Studio for test DB
test-db-studio:
    cd backend && DATABASE_URL="{{TEST_DB_URL}}" bun x drizzle-kit studio --port 4982

# Bench backend test suite — captures wall-time + full log to /tmp/aurore-backend-test.log
# Use with test-clean-count to measure cleanDatabase impact across PRs.
test-bench: test-db-up
    @printf "{{CYAN}}Benching backend tests (output → /tmp/aurore-backend-test.log)...{{NC}}\n"
    cd backend && /usr/bin/time -f "wall=%es cpu=%P max-rss=%MKB" -o /tmp/aurore-backend-test.time \
        env DATABASE_URL={{TEST_DB_URL}} APP_DATABASE_URL={{APP_TEST_DB_URL}} \
        bun test 2>&1 | tee /tmp/aurore-backend-test.log
    @printf "{{GREEN}}--- timing ---{{NC}}\n"
    @cat /tmp/aurore-backend-test.time

# Count how many times cleanDatabase fired in the last test-bench run.
# Baseline (2026-05-22) = ~1559 (one per test). Target after PR2 ≈ 927 (DB tests only).
test-clean-count:
    @if [ ! -f /tmp/aurore-backend-test.log ]; then \
        printf "{{CYAN}}No log yet — run 'just test-bench' first.{{NC}}\n"; \
        exit 1; \
    fi
    @printf "{{CYAN}}cleanDatabase fires in last run:{{NC}} "
    @grep -c "Cleaning database" /tmp/aurore-backend-test.log

# Seed CORE into test DB — requires test-db-up
test-db-seed:
    @printf "{{CYAN}}Seeding CORE into test DB...{{NC}}\n"
    cd backend && export $(grep -v '^\#' ../.env.dev | xargs) && DATABASE_URL={{TEST_DB_URL}} APP_DATABASE_URL={{APP_TEST_DB_URL}} bun run src/db/seed/seeders/seed-core.ts --reset
    @printf "{{GREEN}}✓ CORE seed done on test DB{{NC}}\n"
