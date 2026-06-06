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

# Sonde PETA marque par marque (~220) → statut cruelty-free dans brand_certifications.
# Env: REFRESH (re-fetch), WRITE (applique), STRICT_PRUNE (retire les `peta` périmés du seed).
ingest-peta:
    #!/usr/bin/env bash
    set -euo pipefail
    source {{justfile_directory()}}/scripts/just/_lib.sh
    TARGET="${TARGET:-dev}"
    target_compose
    if [ "$TARGET" = prod ] && [ -n "${WRITE:-}" ]; then confirm_prod "WRITE (ingest-peta)"; fi
    MODE=$([ -n "${WRITE:-}" ] && echo "WRITE" || echo "dry-run")
    printf "{{CYAN}}Ingest PETA cruelty-free ($MODE, $TARGET)...{{NC}}\n"
    $COMPOSE exec api bun run src/db/seed/ingest/peta-cruelty-free/main.ts \
        ${REFRESH:+--refresh} \
        ${WRITE:+--write} \
        ${STRICT_PRUNE:+--strict-prune}

# Télécharge le dump Open Beauty Facts (~17 MB) → agrège par marque vegan/cruelty-free/naturel
# (claim si ≥THRESHOLD des produits portent le label) → enrichit brand_certifications.
# Env: DOWNLOAD (force re-DL), WRITE, THRESHOLD (ratio, déf 0.5), NO_WHITELIST (toutes marques).
ingest-obf:
    #!/usr/bin/env bash
    set -euo pipefail
    source {{justfile_directory()}}/scripts/just/_lib.sh
    TARGET="${TARGET:-dev}"
    target_compose
    if [ "$TARGET" = prod ] && [ -n "${WRITE:-}" ]; then confirm_prod "WRITE (ingest-obf)"; fi
    MODE=$([ -n "${WRITE:-}" ] && echo "WRITE" || echo "dry-run")
    printf "{{CYAN}}Ingest OBF brand labels ($MODE, $TARGET)...{{NC}}\n"
    $COMPOSE exec api bun run src/db/seed/ingest/obf-brand-labels/main.ts \
        ${DOWNLOAD:+--download} \
        ${WRITE:+--write} \
        ${THRESHOLD:+--threshold "$THRESHOLD"} \
        ${NO_WHITELIST:+--no-whitelist}

# Récupère des INCI propres sur INCIDecoder pour les produits à INCI faible. 4 phases séquentielles:
#   crawl = liste produits/marque · match = associe aux tiens · fetch = récupère INCI · apply = écrit en DB.
# Usage: just ingest-incidecoder crawl  (puis match, fetch, apply)  ·  TARGET=prod … apply
ingest-incidecoder phase:
    #!/usr/bin/env bash
    set -euo pipefail
    case "{{phase}}" in
        crawl|match|fetch|apply) ;;
        *) printf "{{RED}}phase invalide: crawl|match|fetch|apply{{NC}}\n"; exit 1 ;;
    esac
    source {{justfile_directory()}}/scripts/just/_lib.sh
    TARGET="${TARGET:-dev}"
    target_compose
    if [ "$TARGET" = prod ] && [ "{{phase}}" = "apply" ]; then confirm_prod "WRITE (incidecoder apply)"; fi
    printf "{{CYAN}}Ingest INCIDecoder phase {{phase}} ($TARGET)...{{NC}}\n"
    $COMPOSE exec api bun run src/db/seed/ingest/incidecoder/main.ts --{{phase}}

# ─── Maintenance produits ───────────────────────────────────────────────────
# audit = rapport seul · dedupe = édite les fichiers seed · scan = lit un dump DB. Aucun n'écrit la DB live.

# Scanne les produits → rapporte doublons, descriptions vides, INCI manquante, casse douteuse. Lecture seule.
# Env: WRITE → écrit output/imported-products-audit.{json,md} (sinon console).
audit-imported-products:
    #!/usr/bin/env bash
    set -euo pipefail
    source {{justfile_directory()}}/scripts/just/_lib.sh
    TARGET="${TARGET:-dev}"
    target_compose
    MODE=$([ -n "${WRITE:-}" ] && echo "WRITE (output/)" || echo "console")
    printf "{{CYAN}}Audit imported products ($MODE, $TARGET)...{{NC}}\n"
    $COMPOSE exec api bun run src/db/seed/maintenance/audit-imported-products.ts \
        ${WRITE:+--write}

# Repère le même produit en plusieurs tailles dans les .seed.ts (-400ml, -recharge…) → supprime
# les variantes, garde la canonique. Édite les fichiers seed. Env: APPLY (sans = dry-run).
dedupe-product-variants:
    #!/usr/bin/env bash
    set -euo pipefail
    source {{justfile_directory()}}/scripts/just/_lib.sh
    TARGET="${TARGET:-dev}"
    target_compose
    if [ "$TARGET" = prod ] && [ -n "${APPLY:-}" ]; then confirm_prod "WRITE (dedupe variants)"; fi
    MODE=$([ -n "${APPLY:-}" ] && echo "APPLY" || echo "dry-run")
    printf "{{CYAN}}Dedupe product variants ($MODE, $TARGET)...{{NC}}\n"
    # script drops rows by default — APPLY unset injects --dry, the sole safety net; keep this polarity
    $COMPOSE exec api bun run src/db/seed/maintenance/dedupe-product-variants.ts \
        $([ -z "${APPLY:-}" ] && echo "--dry" || true)

# Scanne un dump SQL (COPY ou INSERT/--inserts) → 4 signaux de doublons:
#   slug avec faute · kits/lots · INCI quasi-identiques même marque · paires base+recharge.
# Path lu dans le conteneur api (CWD /app/backend), relatif à backend/. Défaut = snapshot commité.
# Ex custom: just scan-db-duplicates src/db/my-dump.sql
scan-db-duplicates backup="src/db/snapshot/data.sql":
    #!/usr/bin/env bash
    set -euo pipefail
    source {{justfile_directory()}}/scripts/just/_lib.sh
    TARGET="${TARGET:-dev}"
    target_compose
    printf "{{CYAN}}Scan DB duplicates from {{backup}} ($TARGET)...{{NC}}\n"
    $COMPOSE exec api bun run src/db/seed/maintenance/scan-db-duplicates.ts {{backup}}
