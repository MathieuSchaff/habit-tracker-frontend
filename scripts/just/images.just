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
[group('images')]
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
    $COMPOSE exec -w /app/backend api bun run src/images/upload/main.ts \
        ${SLUG:+"$SLUG"} \
        ${URL:+--url "$URL"} \
        ${FILE:+--file "$FILE"} \
        ${BATCH:+--batch "$BATCH"} \
        ${DRY:+--dry} \
        ${NO_DB:+--no-db} \
        ${NO_STAGED:+--no-staged} \
        ${CONCURRENCY:+--concurrency "$CONCURRENCY"}

# Batch upload depuis output/images-source/ (workflow legacy).
[group('images')]
image-upload-batch:
    #!/usr/bin/env bash
    set -euo pipefail
    source {{justfile_directory()}}/scripts/just/_lib.sh
    TARGET="${TARGET:-dev}"
    target_compose
    if [ "$TARGET" = prod ]; then confirm_prod "WRITE (image-upload-batch)"; fi
    printf "{{CYAN}}Batch upload from output/images-source/ ($TARGET)...{{NC}}\n"
    $COMPOSE exec -w /app/backend api bun run src/images/upload/batch.ts

# Patch imageUrl dans les *.seed.ts vers convention CDN (pas la DB — re-seed pour appliquer). Env: APPLY (sans = dry-run).
[group('images')]
image-patch-urls:
    #!/usr/bin/env bash
    set -euo pipefail
    source {{justfile_directory()}}/scripts/just/_lib.sh
    TARGET="${TARGET:-dev}"
    target_compose
    if [ "$TARGET" = prod ] && [ -n "${APPLY:-}" ]; then confirm_prod "WRITE (patch image_url)"; fi
    MODE=$([ -n "${APPLY:-}" ] && echo "APPLY" || echo "dry-run")
    printf "{{CYAN}}Patch image URLs ($MODE, $TARGET)...{{NC}}\n"
    $COMPOSE exec -w /app/backend api bun run src/images/maintenance/patch-urls.ts \
        $([ -z "${APPLY:-}" ] && echo "--dry" || true)

# Dump JSON des orphelins (consommable par delete-bunny.ts manuel). Read-only.
[group('images')]
image-dump-orphans:
    #!/usr/bin/env bash
    set -euo pipefail
    source {{justfile_directory()}}/scripts/just/_lib.sh
    TARGET="${TARGET:-dev}"
    target_compose
    printf "{{CYAN}}Dump orphan images to output/ ($TARGET)...{{NC}}\n"
    $COMPOSE exec -w /app/backend api bun run src/images/audit/dump-orphans.ts

# Audit autoritatif CDN⇄DB : orphelins Bunny, refs DB cassées, échantillon de reachability. Read-only.
[group('images')]
audit-cdn:
    #!/usr/bin/env bash
    set -euo pipefail
    source {{justfile_directory()}}/scripts/just/_lib.sh
    TARGET="${TARGET:-dev}"
    target_compose
    printf "{{CYAN}}Audit CDN⇄DB ($TARGET) → .audit-out/db/audit-cdn.$TARGET.md{{NC}}\n"
    $COMPOSE exec -w /app/backend api bun run src/images/audit/bunny.ts \
        | tee "$(audit_out audit-cdn)"

# Génère output/image-mapping.json depuis l'inventaire Bunny ∩ DB (prérequis de image-fix-refs). Env: DRY (sans = écrit le fichier).
[group('images')]
image-build-mapping:
    #!/usr/bin/env bash
    set -euo pipefail
    source {{justfile_directory()}}/scripts/just/_lib.sh
    TARGET="${TARGET:-dev}"
    target_compose
    MODE=$([ -n "${DRY:-}" ] && echo "dry-run" || echo "WRITE (output/)")
    printf "{{CYAN}}Build image mapping ($MODE, $TARGET)...{{NC}}\n"
    $COMPOSE exec -w /app/backend api bun run src/images/maintenance/build-mapping.ts \
        ${DRY:+--dry}

# Réconcilie image_url DB ⇄ Bunny depuis image-mapping.json (rename/nullify/cleanup). Écrit DB+CDN. Env: APPLY (sans = dry-run). TARGET: dev|prod (prod+APPLY → confirm).
[group('images')]
image-fix-refs:
    #!/usr/bin/env bash
    set -euo pipefail
    source {{justfile_directory()}}/scripts/just/_lib.sh
    TARGET="${TARGET:-dev}"
    target_compose
    if [ "$TARGET" = prod ] && [ -n "${APPLY:-}" ]; then confirm_prod "WRITE DB+CDN (image-fix-refs)"; fi
    MODE=$([ -n "${APPLY:-}" ] && echo "APPLY" || echo "dry-run")
    printf "{{CYAN}}Fix broken image refs ($MODE, $TARGET)...{{NC}}\n"
    $COMPOSE exec -w /app/backend api bun run src/images/maintenance/fix-broken-refs.ts \
        ${APPLY:+--apply}
