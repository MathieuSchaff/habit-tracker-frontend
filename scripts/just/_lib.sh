#!/usr/bin/env bash
# Shared helpers for env-driven recipes (db/audit/data/images/inci).
# Sourced inside recipe shebang blocks:
#   source {{justfile_directory()}}/scripts/just/_lib.sh
# Requires COMPOSE_DEV / COMPOSE_PROD in the environment (exported from _vars.just).

# Set $COMPOSE from $TARGET (dev|prod). Aborts the recipe on an invalid TARGET.
target_compose() {
    case "${TARGET:-dev}" in
        dev)  COMPOSE="$COMPOSE_DEV" ;;
        prod) COMPOSE="$COMPOSE_PROD" ;;
        *)    printf '\033[0;31mTARGET invalide: dev|prod (got '\''%s'\'')\033[0m\n' "${TARGET:-}" >&2; exit 1 ;;
    esac
}

# Typed prod confirmation. Args: LABEL [PHRASE=PROD]. Aborts on mismatch.
confirm_prod() {
    local label="$1" phrase="${2:-PROD}" reply
    printf '\033[0;31m⚠ PROD %s — tape '\''%s'\'' pour confirmer\033[0m\n' "$label" "$phrase"
    read -r -p "> " reply
    [ "$reply" = "$phrase" ] || { printf '\033[0;31mabandon\033[0m\n'; exit 1; }
}
