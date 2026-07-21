import '_vars.just'

# CDN images pipeline: Bunny upload + audits + DB URL maintenance.
# All parameters via env vars (prefixed before `just`).
# TARGET=dev (default) | prod. Interactive confirmation when TARGET=prod + write.
#
# Examples:
#   SLUG=brand-product URL=https://… just image-upload
#   BATCH=/path/to/jobs.json just image-upload

# Upload an image to Bunny CDN + update DB. Env: SLUG, URL, FILE, BATCH,
# WRITE (omit = dry-run), NO_DB, NO_STAGED, CONCURRENCY.
[doc("Upload an image to Bunny CDN + update DB. Env: SLUG|BATCH, URL, FILE, WRITE (omit = dry-run), NO_DB, NO_STAGED, CONCURRENCY")]
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

# Build output/image-mapping.json from the Bunny ∩ DB inventory (prerequisite of
# image-fix-refs). Writes a local artifact only (no DB, no CDN), so no mode flag.
[doc("Build output/image-mapping.json from the Bunny ∩ DB inventory (prerequisite of image-fix-refs). Local artifact, no mode")]
[group('images')]
image-build-mapping:
    #!/usr/bin/env bash
    set -euo pipefail
    source {{justfile_directory()}}/scripts/just/_lib.sh
    TARGET="${TARGET:-dev}"
    target_compose
    printf "{{CYAN}}Build image mapping ($TARGET)...{{NC}}\n"
    $COMPOSE exec -w /app/backend api bun run src/images/maintenance/build-mapping.ts

# Reconcile DB image_url ⇄ Bunny from image-mapping.json (rename/nullify/cleanup). Writes DB+CDN. Env: WRITE (omit = dry-run). TARGET: dev|prod (prod+WRITE → confirm).
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
