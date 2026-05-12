import '_vars.just'

# Data ingest (sources externes) + maintenance produits (dédup, audits).
# Tous les paramètres via env vars (préfixées avant `just`).
# TARGET=dev (default) | prod. Confirmation interactive si TARGET=prod + WRITE/APPLY.
#
# Exemples:
#   WRITE=1 just ingest-peta                          # dev write
#   TARGET=prod just audit-imported-products          # audit prod read-only
#   TARGET=prod REFRESH=1 WRITE=1 just ingest-peta    # prod write (confirmation)

# ─── Ingest ─────────────────────────────────────────────────────────────────

# Import PETA cruelty-free brand status. Env: REFRESH, WRITE, STRICT_PRUNE.
ingest-peta:
    #!/usr/bin/env bash
    set -euo pipefail
    TARGET="${TARGET:-dev}"
    case "$TARGET" in
        dev)  COMPOSE="{{COMPOSE_DEV}}" ;;
        prod) COMPOSE="{{COMPOSE_PROD}}" ;;
        *)    printf "{{RED}}TARGET invalide: dev|prod (got '$TARGET'){{NC}}\n"; exit 1 ;;
    esac
    if [ "$TARGET" = "prod" ] && [ -n "${WRITE:-}" ]; then
        printf "{{RED}}⚠ PROD WRITE (ingest-peta) — tape 'PROD' pour confirmer{{NC}}\n"
        read -r -p "> " C
        [ "$C" = "PROD" ] || { printf "{{RED}}abandon{{NC}}\n"; exit 1; }
    fi
    MODE=$([ -n "${WRITE:-}" ] && echo "WRITE" || echo "dry-run")
    printf "{{CYAN}}Ingest PETA cruelty-free ($MODE, $TARGET)...{{NC}}\n"
    $COMPOSE exec api bun run src/db/seed/ingest/peta-cruelty-free/main.ts \
        ${REFRESH:+--refresh} \
        ${WRITE:+--write} \
        ${STRICT_PRUNE:+--strict-prune}

# Import OBF brand labels. Env: DOWNLOAD, WRITE, THRESHOLD, NO_WHITELIST.
ingest-obf:
    #!/usr/bin/env bash
    set -euo pipefail
    TARGET="${TARGET:-dev}"
    case "$TARGET" in
        dev)  COMPOSE="{{COMPOSE_DEV}}" ;;
        prod) COMPOSE="{{COMPOSE_PROD}}" ;;
        *)    printf "{{RED}}TARGET invalide: dev|prod (got '$TARGET'){{NC}}\n"; exit 1 ;;
    esac
    if [ "$TARGET" = "prod" ] && [ -n "${WRITE:-}" ]; then
        printf "{{RED}}⚠ PROD WRITE (ingest-obf) — tape 'PROD' pour confirmer{{NC}}\n"
        read -r -p "> " C
        [ "$C" = "PROD" ] || { printf "{{RED}}abandon{{NC}}\n"; exit 1; }
    fi
    MODE=$([ -n "${WRITE:-}" ] && echo "WRITE" || echo "dry-run")
    printf "{{CYAN}}Ingest OBF brand labels ($MODE, $TARGET)...{{NC}}\n"
    $COMPOSE exec api bun run src/db/seed/ingest/obf-brand-labels/main.ts \
        ${DOWNLOAD:+--download} \
        ${WRITE:+--write} \
        ${THRESHOLD:+--threshold "$THRESHOLD"} \
        ${NO_WHITELIST:+--no-whitelist}

# Scrape INCIDecoder par phases. Phase positionnelle: crawl|match|fetch|apply.
# Usage: just ingest-incidecoder crawl
#        TARGET=prod just ingest-incidecoder apply
ingest-incidecoder phase:
    #!/usr/bin/env bash
    set -euo pipefail
    case "{{phase}}" in
        crawl|match|fetch|apply) ;;
        *) printf "{{RED}}phase invalide: crawl|match|fetch|apply{{NC}}\n"; exit 1 ;;
    esac
    TARGET="${TARGET:-dev}"
    case "$TARGET" in
        dev)  COMPOSE="{{COMPOSE_DEV}}" ;;
        prod) COMPOSE="{{COMPOSE_PROD}}" ;;
        *)    printf "{{RED}}TARGET invalide: dev|prod (got '$TARGET'){{NC}}\n"; exit 1 ;;
    esac
    if [ "$TARGET" = "prod" ] && [ "{{phase}}" = "apply" ]; then
        printf "{{RED}}⚠ PROD WRITE (incidecoder apply) — tape 'PROD' pour confirmer{{NC}}\n"
        read -r -p "> " C
        [ "$C" = "PROD" ] || { printf "{{RED}}abandon{{NC}}\n"; exit 1; }
    fi
    printf "{{CYAN}}Ingest INCIDecoder phase {{phase}} ($TARGET)...{{NC}}\n"
    $COMPOSE exec api bun run src/db/seed/ingest/incidecoder/main.ts --{{phase}}

# ─── Maintenance produits ───────────────────────────────────────────────────

# Détecte doublons produits post-import. Env: WRITE (output/imported-products-audit.{json,md}).
audit-imported-products:
    #!/usr/bin/env bash
    set -euo pipefail
    TARGET="${TARGET:-dev}"
    case "$TARGET" in
        dev)  COMPOSE="{{COMPOSE_DEV}}" ;;
        prod) COMPOSE="{{COMPOSE_PROD}}" ;;
        *)    printf "{{RED}}TARGET invalide: dev|prod (got '$TARGET'){{NC}}\n"; exit 1 ;;
    esac
    MODE=$([ -n "${WRITE:-}" ] && echo "WRITE (output/)" || echo "console")
    printf "{{CYAN}}Audit imported products ($MODE, $TARGET)...{{NC}}\n"
    $COMPOSE exec api bun run src/db/seed/maintenance/audit-imported-products.ts \
        ${WRITE:+--write}

# Dédup variants produit. Env: APPLY (sans APPLY = dry-run).
dedupe-product-variants:
    #!/usr/bin/env bash
    set -euo pipefail
    TARGET="${TARGET:-dev}"
    case "$TARGET" in
        dev)  COMPOSE="{{COMPOSE_DEV}}" ;;
        prod) COMPOSE="{{COMPOSE_PROD}}" ;;
        *)    printf "{{RED}}TARGET invalide: dev|prod (got '$TARGET'){{NC}}\n"; exit 1 ;;
    esac
    if [ "$TARGET" = "prod" ] && [ -n "${APPLY:-}" ]; then
        printf "{{RED}}⚠ PROD WRITE (dedupe variants) — tape 'PROD' pour confirmer{{NC}}\n"
        read -r -p "> " C
        [ "$C" = "PROD" ] || { printf "{{RED}}abandon{{NC}}\n"; exit 1; }
    fi
    MODE=$([ -n "${APPLY:-}" ] && echo "APPLY" || echo "dry-run")
    printf "{{CYAN}}Dedupe product variants ($MODE, $TARGET)...{{NC}}\n"
    $COMPOSE exec api bun run src/db/seed/maintenance/dedupe-product-variants.ts \
        $([ -z "${APPLY:-}" ] && echo "--dry" || true)

# Scan doublons DB depuis backup SQL. Argument positionnel = chemin backup.
# Usage: just scan-db-duplicates /path/to/backup.sql
scan-db-duplicates backup:
    #!/usr/bin/env bash
    set -euo pipefail
    TARGET="${TARGET:-dev}"
    case "$TARGET" in
        dev)  COMPOSE="{{COMPOSE_DEV}}" ;;
        prod) COMPOSE="{{COMPOSE_PROD}}" ;;
        *)    printf "{{RED}}TARGET invalide: dev|prod (got '$TARGET'){{NC}}\n"; exit 1 ;;
    esac
    printf "{{CYAN}}Scan DB duplicates from {{backup}} ($TARGET)...{{NC}}\n"
    $COMPOSE exec api bun run src/db/seed/maintenance/scan-db-duplicates.ts {{backup}}
