# Shared variables — importé par justfile racine et chaque sous-just/*.just.
# Just dédoublonne les imports, donc OK de l'importer plusieurs fois.

GREEN  := '\033[0;32m'
YELLOW := '\033[0;33m'
CYAN   := '\033[0;36m'
RED    := '\033[0;31m'
NC     := '\033[0m'

COMPOSE_DEV  := "docker compose -f infra/docker/compose/docker-compose.yml -f infra/docker/compose/docker-compose.dev.yml --env-file .env.dev"
COMPOSE_PROD := "docker compose -f infra/docker/compose/docker-compose.yml -f infra/docker/compose/docker-compose.prod.yml --env-file .env.prod"
COMPOSE_TEST := "docker compose -f infra/docker/compose/docker-compose.test.yml -p aurore-test"
COMPOSE_E2E  := "docker compose -f infra/docker/compose/docker-compose.yml -f infra/docker/compose/docker-compose.dev.yml -f infra/docker/compose/docker-compose.e2e.yml -f infra/docker/compose/docker-compose.e2e-ports.yml --env-file .env.dev -p aurore-e2e"
