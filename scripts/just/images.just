import '_vars.just'

# Pipeline images CDN — upload Bunny + audits + maintenance URLs DB.
# Tous les paramètres via env vars (préfixées avant `just`).
# TARGET=dev (default) | prod. Confirmation interactive si TARGET=prod + écriture.
#
# Exemples:
#   SLUG=brand-product URL=https://… just image-upload
#   BATCH=/path/to/jobs.json just image-upload
#   TARGET=prod APPLY=1 just image-patch-urls         # prod confirmation

# Upload une image vers Bunny CDN + update DB. Env: SLUG, URL, FILE, BATCH, DRY, NO_DB, NO_STAGED, CONCURRENCY.
image-upload:
    #!/usr/bin/env bash
    set -euo pipefail
    if [ -z "${SLUG:-}" ] && [ -z "${BATCH:-}" ]; then
        printf "{{RED}}SLUG ou BATCH requis (env vars){{NC}}\n"; exit 1
    fi
    source {{justfile_directory()}}/scripts/just/_lib.sh
    TARGET="${TARGET:-dev}"
    target_compose
    if [ "$TARGET" = prod ] && [ -z "${DRY:-}" ] && [ -z "${NO_DB:-}" ]; then confirm_prod "WRITE (image-upload)"; fi
    MODE=$([ -n "${DRY:-}" ] && echo "DRY" || echo "APPLY")
    printf "{{CYAN}}Image upload ($MODE, $TARGET)...{{NC}}\n"
    $COMPOSE exec api bun run src/images/upload/main.ts \
        ${SLUG:+"$SLUG"} \
        ${URL:+--url "$URL"} \
        ${FILE:+--file "$FILE"} \
        ${BATCH:+--batch "$BATCH"} \
        ${DRY:+--dry} \
        ${NO_DB:+--no-db} \
        ${NO_STAGED:+--no-staged} \
        ${CONCURRENCY:+--concurrency "$CONCURRENCY"}

# Batch upload depuis output/images-source/ (workflow legacy).
image-upload-batch:
    #!/usr/bin/env bash
    set -euo pipefail
    source {{justfile_directory()}}/scripts/just/_lib.sh
    TARGET="${TARGET:-dev}"
    target_compose
    if [ "$TARGET" = prod ]; then confirm_prod "WRITE (image-upload-batch)"; fi
    printf "{{CYAN}}Batch upload from output/images-source/ ($TARGET)...{{NC}}\n"
    $COMPOSE exec api bun run src/images/upload/batch.ts

# Patch products.image_url vers convention CDN. Env: APPLY (sans = dry-run).
image-patch-urls:
    #!/usr/bin/env bash
    set -euo pipefail
    source {{justfile_directory()}}/scripts/just/_lib.sh
    TARGET="${TARGET:-dev}"
    target_compose
    if [ "$TARGET" = prod ] && [ -n "${APPLY:-}" ]; then confirm_prod "WRITE (patch image_url)"; fi
    MODE=$([ -n "${APPLY:-}" ] && echo "APPLY" || echo "dry-run")
    printf "{{CYAN}}Patch image URLs ($MODE, $TARGET)...{{NC}}\n"
    $COMPOSE exec api bun run src/images/maintenance/patch-urls.ts \
        $([ -z "${APPLY:-}" ] && echo "--dry" || true)

# Audit : images CDN sans produit DB matchant. Env: BRAND, TOP. Read-only.
image-analyze-orphans:
    #!/usr/bin/env bash
    set -euo pipefail
    source {{justfile_directory()}}/scripts/just/_lib.sh
    TARGET="${TARGET:-dev}"
    target_compose
    printf "{{CYAN}}Analyze image orphans ($TARGET)...{{NC}}\n"
    $COMPOSE exec api bun run src/images/audit/analyze-orphans.ts \
        ${BRAND:+--brand "$BRAND"} \
        ${TOP:+--top "$TOP"}

# Dump JSON des orphelins (consommable par delete-bunny.ts manuel). Read-only.
image-dump-orphans:
    #!/usr/bin/env bash
    set -euo pipefail
    source {{justfile_directory()}}/scripts/just/_lib.sh
    TARGET="${TARGET:-dev}"
    target_compose
    printf "{{CYAN}}Dump orphan images to output/ ($TARGET)...{{NC}}\n"
    $COMPOSE exec api bun run src/images/audit/dump-orphans.ts
