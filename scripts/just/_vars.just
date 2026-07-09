# Shared variables — importé par justfile racine et chaque sous-just/*.just.
# Just dédoublonne les imports, donc OK de l'importer plusieurs fois.

GREEN  := '\033[0;32m'
YELLOW := '\033[0;33m'
CYAN   := '\033[0;36m'
RED    := '\033[0;31m'
NC     := '\033[0m'

export COMPOSE_DEV  := "docker compose -f infra/docker/compose/docker-compose.yml -f infra/docker/compose/docker-compose.dev.yml --env-file .env.dev -p aurore"
export COMPOSE_PROD := "docker compose -f infra/docker/compose/docker-compose.yml -f infra/docker/compose/docker-compose.prod.yml --env-file .env.prod -p aurore"
# Observability overlay (Alloy → Grafana Cloud). Same project (-p aurore) so it shares
# aurore_appnet, but a separate compose file so its lifecycle is independent of the app.
export COMPOSE_MON := "docker compose -f infra/docker/compose/docker-compose.monitoring.yml --env-file .env.prod -p aurore"
COMPOSE_TEST := "docker compose -f infra/docker/compose/docker-compose.test.yml -p aurore-test"
COMPOSE_PROFILE := "docker compose -f infra/docker/compose/docker-compose.profile.yml -p aurore-profile"
COMPOSE_E2E  := "docker compose -f infra/docker/compose/docker-compose.yml -f infra/docker/compose/docker-compose.dev.yml -f infra/docker/compose/docker-compose.e2e.yml --env-file .env.dev -p aurore-e2e"

# Committed seed snapshot, restored by db-* and e2e-up.
SNAPSHOT_FILE := "backend/src/db/snapshot/data.sql"

# Catalogue-only snapshot (no users/reviews/runtime) for prod seeding. Owner FK
# rewritten to __OWNER_ID__, resolved at load to the db-prod-admin user.
CATALOGUE_FILE := "backend/src/db/snapshot/catalogue.sql"
