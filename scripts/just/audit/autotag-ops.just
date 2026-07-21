# Auto-tagging write-ops: propagate a detector change to the DB.
# (Not read-only audits: backfill/reconcile write, goldset samples,
#  explain traces, catalog-fix-tag-domain fixes.)
#
# ── backfill vs reconcile: two ways to propagate a detector change ──
# Options via env BEFORE just:  WRITE=1 just autotag-backfill   (else dry-run)
#
#   ┌──────────────────────────────────────────────────────┬──────────┬───────────────────┐
#   │                                                      │ backfill │     reconcile     │
#   ├──────────────────────────────────────────────────────┼──────────┼───────────────────┤
#   │ inserts new links (detector emits, DB lacks them)    │ ✅       │ ✅                │
#   ├──────────────────────────────────────────────────────┼──────────┼───────────────────┤
#   │ raises relevance (secondary→primary)                 │ ✅       │ ✅                │
#   ├──────────────────────────────────────────────────────┼──────────┼───────────────────┤
#   │ drops stale links (DB has them, detector stopped)    │ ❌       │ ✅                │
#   ├──────────────────────────────────────────────────────┼──────────┼───────────────────┤
#   │ lowers relevance (primary→secondary)                 │ ❌       │ ✅                │
#   ├──────────────────────────────────────────────────────┼──────────┼───────────────────┤
#   │ touches manual tags (admin/user)                     │ no       │ no (manual-safe)  │
#   └──────────────────────────────────────────────────────┴──────────┴───────────────────┘
#
# reconcile = DELETE non-manual + re-INSERT detector output (writeTagsForProduct) =
# EXACT sync: add + drop + relevance ↕. backfill = additive/upgrade-only, NEVER deletes
# nor downgrades (safe, e.g. cautious prod). reconcile ⊇ backfill → after a reconcile,
# backfill finds 0 to insert.

# Fix tag_products rows violating domain constraints (skincare tagTypes on haircare products). Env: WRITE=1 (apply). TARGET: dev|prod (prod+WRITE → confirm).
[group('catalog')]
catalog-fix-tag-domain:
    #!/usr/bin/env bash
    set -euo pipefail
    source {{justfile_directory()}}/scripts/just/_lib.sh
    data_run "catalog-fix-tag-domain" "src/db/seed/maintenance/fix-tag-domain-consistency.ts"

# Backfill auto-tags. Env: SLUG, WRITE (apply), LIMIT, CONF_OVERRIDE, INCLUDE_DROPPED.
[group('autotag')]
autotag-backfill:
    #!/usr/bin/env bash
    set -euo pipefail
    source {{justfile_directory()}}/scripts/just/_lib.sh
    TARGET="${TARGET:-dev}"
    target_compose
    if [ "$TARGET" = prod ] && [ -n "${WRITE:-}" ]; then confirm_prod "WRITE (autotag-backfill)"; fi
    MODE=$([ -n "${WRITE:-}" ] && echo "WRITE" || echo "dry-run")
    printf "{{CYAN}}Backfill auto-tags ($MODE, $TARGET)...{{NC}}\n"
    $COMPOSE exec \
        ${CONF_OVERRIDE:+-e CONF_OVERRIDE="$CONF_OVERRIDE"} \
        ${LIMIT:+-e LIMIT="$LIMIT"} \
        ${INCLUDE_DROPPED:+-e INCLUDE_DROPPED="$INCLUDE_DROPPED"} \
        -w /app/backend api bun run src/features/auto-tagging/runners/backfill/main.ts \
        ${WRITE:+--write} \
        ${SLUG:+--slug "$SLUG"}

# Reconcile auto-tags to current orchestrator: drop stale rows + fix relevance downgrades (manual-safe; backfill is additive/upgrade-only). Env: SLUG, WRITE, LIMIT. TARGET: dev|prod.
[group('autotag')]
autotag-reconcile *args:
    #!/usr/bin/env bash
    set -euo pipefail
    # `just autotag-reconcile --write` is the intuitive guess but flags ride env
    # vars here (4 independent knobs: WRITE/SLUG/LIMIT/TARGET). Catch the stray arg
    # and point at the right form instead of just's cryptic "no such recipe".
    ARGS="{{args}}"
    if [ -n "$ARGS" ]; then
        printf "{{RED}}'%s' n'est pas un argument.{{NC}} Les options passent par variable d'env, AVANT 'just' :\n" "$ARGS"
        printf "  {{CYAN}}WRITE=1 just autotag-reconcile{{NC}}   # applique (sinon dry-run)\n"
        printf "  autres : SLUG=… LIMIT=… TARGET=prod\n"
        exit 2
    fi
    source {{justfile_directory()}}/scripts/just/_lib.sh
    TARGET="${TARGET:-dev}"
    target_compose
    if [ "$TARGET" = prod ] && [ -n "${WRITE:-}" ]; then confirm_prod "WRITE (autotag-reconcile)"; fi
    MODE=$([ -n "${WRITE:-}" ] && echo "WRITE" || echo "dry-run")
    printf "{{CYAN}}Reconcile auto-tags ($MODE, $TARGET)...{{NC}}\n"
    $COMPOSE exec \
        ${LIMIT:+-e LIMIT="$LIMIT"} \
        -w /app/backend api bun run src/features/auto-tagging/runners/backfill/reconcile.ts \
        ${WRITE:+--write} \
        ${SLUG:+--slug "$SLUG"}

# Explain auto-tag pipeline: SLUG=<slug> traces a real product (full input: name/desc/brand/texture), INCI="..." traces one raw INCI (INCI-only, blind to name/claim passes), COUNTS=1 aggregates the catalogue. Read-only. Env: SLUG, INCI, KIND (serum), CATEGORY (skincare), COUNTS=1.
[group('autotag')]
autotag-explain:
    #!/usr/bin/env bash
    set -euo pipefail
    source {{justfile_directory()}}/scripts/just/_lib.sh
    TARGET="${TARGET:-dev}"
    target_compose
    if [ -n "${COUNTS:-}" ]; then
        printf "{{CYAN}}Explain auto-tags — catalogue counts ($TARGET)...{{NC}}\n"
        $COMPOSE exec -w /app/backend api bun run src/features/auto-tagging/runners/explain/main.ts --counts
    elif [ -n "${SLUG:-}" ]; then
        printf "{{CYAN}}Explain auto-tags — product trace ($TARGET)...{{NC}}\n"
        $COMPOSE exec -w /app/backend api bun run src/features/auto-tagging/runners/explain/main.ts --slug "$SLUG"
    else
        if [ -z "${INCI:-}" ]; then
            printf "{{RED}}SLUG ou INCI requis (SLUG=<slug> pour un vrai produit, ou INCI=\"aqua, glycerin, ...\"){{NC}}\n"; exit 1
        fi
        printf "{{CYAN}}Explain auto-tags — INCI trace ($TARGET)...{{NC}}\n"
        $COMPOSE exec -w /app/backend api bun run src/features/auto-tagging/runners/explain/main.ts \
            --kind "${KIND:-serum}" --category "${CATEGORY:-skincare}" "$INCI"
    fi

# Stratified sample of 60-80 products → data/gold-set/annotations.json (idempotent). Env: SAMPLE_SIZE, POSITIVES_PER_TAG, NEGATIVES_PER_TAG, SEED, GOLD_SET_PATH.
[group('autotag')]
autotag-goldset:
    #!/usr/bin/env bash
    set -euo pipefail
    source {{justfile_directory()}}/scripts/just/_lib.sh
    TARGET="${TARGET:-dev}"
    target_compose
    printf "{{CYAN}}Gold-set bootstrap ($TARGET)...{{NC}}\n"
    $COMPOSE exec \
        ${SAMPLE_SIZE:+-e SAMPLE_SIZE="$SAMPLE_SIZE"} \
        ${POSITIVES_PER_TAG:+-e POSITIVES_PER_TAG="$POSITIVES_PER_TAG"} \
        ${NEGATIVES_PER_TAG:+-e NEGATIVES_PER_TAG="$NEGATIVES_PER_TAG"} \
        ${SEED:+-e SEED="$SEED"} \
        ${GOLD_SET_PATH:+-e GOLD_SET_PATH="$GOLD_SET_PATH"} \
        -w /app/backend api bun run src/features/auto-tagging/runners/gold-set-bootstrap.ts
