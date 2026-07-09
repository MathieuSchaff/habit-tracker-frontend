#!/usr/bin/env bash
# Shared helpers for env-driven recipes (db/audit/data/images/inci).
# Sourced inside recipe shebang blocks:
#   source {{justfile_directory()}}/scripts/just/_lib.sh
# Requires COMPOSE_DEV / COMPOSE_PROD in the environment (exported from _vars.just).

# Set $COMPOSE from $TARGET (dev|prod). Aborts the recipe on an invalid TARGET.
target_compose() {
    case "${TARGET:-dev}" in
        dev)  COMPOSE="$COMPOSE_DEV" ;;
        prod) COMPOSE="$COMPOSE_PROD"; assert_prod_stack ;;
        *)    printf '\033[0;31mTARGET invalide: dev|prod (got '\''%s'\'')\033[0m\n' "${TARGET:-}" >&2; exit 1 ;;
    esac
}

# TARGET=prod split-brain guard: `compose -p aurore exec` matches whatever
# "aurore" stack is running on THIS host — on the laptop that is the dev stack,
# so a prod recipe would silently read/write dev. Assert the running db
# container was created from the prod compose file before proceeding.
assert_prod_stack() {
    local cid files
    cid="$(docker ps -q \
        --filter label=com.docker.compose.project=aurore \
        --filter label=com.docker.compose.service=db | head -n1)"
    if [ -z "$cid" ]; then
        printf '\033[0;31mTARGET=prod: aucun conteneur db du stack aurore ne tourne ici.\033[0m\n' >&2
        printf 'Depuis le laptop, passe par: just prod-ssh '\''TARGET=prod … just <recette>'\''\n' >&2
        exit 1
    fi
    files="$(docker inspect "$cid" --format '{{index .Config.Labels "com.docker.compose.project.config_files"}}')"
    case "$files" in
        *docker-compose.prod.yml*) ;;
        *)
            printf '\033[0;31mTARGET=prod mais le stack local n'\''est PAS prod (%s).\033[0m\n' "$files" >&2
            printf 'Depuis le laptop, passe par: just prod-ssh '\''TARGET=prod … just <recette>'\''\n' >&2
            exit 1 ;;
    esac
}

# Standard runner for env-driven data recipes: resolves TARGET, guards prod
# writes, prints the banner, then runs the script in the api container.
# Reads WRITE from the environment (appends --write + prod confirmation).
# SEED_OWNER_EMAIL is forwarded for the catalogue ingest; harmless elsewhere.
# Usage: data_run <label> <script.ts> [script args…]
data_run() {
    local label="$1" script="$2" mode
    shift 2
    TARGET="${TARGET:-dev}"
    target_compose
    if [ "$TARGET" = prod ] && [ -n "${WRITE:-}" ]; then confirm_prod "WRITE ($label)"; fi
    mode=$([ -n "${WRITE:-}" ] && echo "WRITE" || echo "dry-run")
    printf '\033[0;36m%s (%s, %s)...\033[0m\n' "$label" "$mode" "$TARGET"
    $COMPOSE exec -w /app/backend ${SEED_OWNER_EMAIL:+-e SEED_OWNER_EMAIL="$SEED_OWNER_EMAIL"} api \
        bun run "$script" "$@" ${WRITE:+--write}
}

# Echo a host-side report path .audit-out/db/<name>.<TARGET>.md, creating the dir.
# Usage: $COMPOSE exec ... | tee "$(audit_out <name>)"
audit_out() {
    local dir
    dir="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)/.audit-out/db"
    mkdir -p "$dir"
    printf '%s/%s.%s.md\n' "$dir" "$1" "${TARGET:-dev}"
}

# Typed prod confirmation. Args: LABEL [PHRASE=PROD]. Aborts on mismatch.
confirm_prod() {
    local label="$1" phrase="${2:-PROD}" reply
    printf '\033[0;31m⚠ PROD %s — tape '\''%s'\'' pour confirmer\033[0m\n' "$label" "$phrase"
    read -r -p "> " reply
    [ "$reply" = "$phrase" ] || { printf '\033[0;31mabandon\033[0m\n'; exit 1; }
}
