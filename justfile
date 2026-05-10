set shell := ["bash", "-c"]

GREEN  := '\033[0;32m'
YELLOW := '\033[0;33m'
CYAN   := '\033[0;36m'
RED    := '\033[0;31m'
NC     := '\033[0m'

COMPOSE_DEV  := "docker compose -f docker-compose.yml -f docker-compose.dev.yml --env-file .env.dev"
COMPOSE_PROD := "docker compose -f docker-compose.yml -f docker-compose.prod.yml --env-file .env.prod"
COMPOSE_TEST := "docker compose -f docker-compose.test.yml"
COMPOSE_E2E  := "docker compose -f docker-compose.yml -f docker-compose.dev.yml -f docker-compose.e2e.yml --env-file .env.dev"

TEST_DB_URL     := "postgres://app:testpassword@localhost:5433/appdb_test"
APP_TEST_DB_URL := "postgres://app_runtime:testpassword@localhost:5433/appdb_test"

ALGO_DERM_DIR := "../algo-derm"
SNAPSHOT_FILE := "backend/src/db/snapshot/data.sql"

import 'just/dev.just'
import 'just/test.just'
import 'just/e2e.just'
import 'just/db.just'
import 'just/audit.just'
import 'just/quality.just'
import 'just/ops.just'

# Show available commands
help:
    @just --list
