import '_vars.just'

# Pipeline images CDN — upload Bunny + audits + maintenance URLs DB.
# Tous les paramètres via env vars (préfixées avant `just`).
# TARGET=dev (default) | prod. Confirmation interactive si TARGET=prod + écriture.
#
# Exemples:
#   SLUG=brand-product URL=https://… just image-upload
#   BATCH=/path/to/jobs.json just image-upload
#   TARGET=prod WRITE=1 just image-patch-urls         # prod confirmation

# Upload une image vers Bunny CDN + update DB. Env: SLUG, URL, FILE, BATCH,
# WRITE (sans = dry-run), NO_DB, NO_STAGED, CONCURRENCY.
[doc("Upload une image vers Bunny CDN + update DB. Env: SLUG|BATCH, URL, FILE, WRITE (sans = dry-run), NO_DB, NO_STAGED, CONCURRENCY")]
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
    if [ "$TARGET" = prod ] && [ -n "${WRITE:-}" ] && [ -z "${NO_DB:-}" ]; then confirm_prod "WRITE (image-upload)"; fi
    MODE=$([ -n "${WRITE:-}" ] && echo "WRITE" || echo "dry-run")
    printf "{{CYAN}}Image upload ($MODE, $TARGET)...{{NC}}\n"
    $COMPOSE exec -w /app/backend api bun run src/images/upload/main.ts \
        ${SLUG:+"$SLUG"} \
        ${URL:+--url "$URL"} \
        ${FILE:+--file "$FILE"} \
        ${BATCH:+--batch "$BATCH"} \
        $([ -z "${WRITE:-}" ] && echo "--dry" || true) \
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

# Patch imageUrl dans les *.seed.ts vers convention CDN (pas la DB — re-seed pour appliquer). Env: WRITE (sans = dry-run).
[group('images')]
image-patch-urls:
    #!/usr/bin/env bash
    set -euo pipefail
    source {{justfile_directory()}}/scripts/just/_lib.sh
    TARGET="${TARGET:-dev}"
    target_compose
    if [ "$TARGET" = prod ] && [ -n "${WRITE:-}" ]; then confirm_prod "WRITE (patch image_url)"; fi
    MODE=$([ -n "${WRITE:-}" ] && echo "WRITE" || echo "dry-run")
    printf "{{CYAN}}Patch image URLs ($MODE, $TARGET)...{{NC}}\n"
    $COMPOSE exec -w /app/backend api bun run src/images/maintenance/patch-urls.ts \
        $([ -z "${WRITE:-}" ] && echo "--dry" || true)

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

# Génère output/image-mapping.json depuis l'inventaire Bunny ∩ DB (prérequis de
# image-fix-refs). Écrit un artefact local seulement (ni DB ni CDN) — pas de mode.
[doc("Génère output/image-mapping.json depuis l'inventaire Bunny ∩ DB (prérequis de image-fix-refs). Artefact local, pas de mode")]
[group('images')]
image-build-mapping:
    #!/usr/bin/env bash
    set -euo pipefail
    source {{justfile_directory()}}/scripts/just/_lib.sh
    TARGET="${TARGET:-dev}"
    target_compose
    printf "{{CYAN}}Build image mapping ($TARGET)...{{NC}}\n"
    $COMPOSE exec -w /app/backend api bun run src/images/maintenance/build-mapping.ts

# Réconcilie image_url DB ⇄ Bunny depuis image-mapping.json (rename/nullify/cleanup). Écrit DB+CDN. Env: WRITE (sans = dry-run). TARGET: dev|prod (prod+WRITE → confirm).
[group('images')]
image-fix-refs:
    #!/usr/bin/env bash
    set -euo pipefail
    source {{justfile_directory()}}/scripts/just/_lib.sh
    TARGET="${TARGET:-dev}"
    target_compose
    if [ "$TARGET" = prod ] && [ -n "${WRITE:-}" ]; then confirm_prod "WRITE DB+CDN (image-fix-refs)"; fi
    MODE=$([ -n "${WRITE:-}" ] && echo "WRITE" || echo "dry-run")
    printf "{{CYAN}}Fix broken image refs ($MODE, $TARGET)...{{NC}}\n"
    $COMPOSE exec -w /app/backend api bun run src/images/maintenance/fix-broken-refs.ts \
        ${WRITE:+--apply}
