# Auto-tagging write-ops — propagent un changement de détecteur vers la DB.
# (Pas des audits read-only : backfill/reconcile écrivent, goldset échantillonne,
#  explain trace, catalog-fix-tag-domain corrige.)
#
# ── backfill vs reconcile — deux façons de propager un changement de détecteur ──
# Options via env AVANT just :  WRITE=1 just autotag-backfill   (sinon dry-run)
#
#   ┌──────────────────────────────────────────────────────┬──────────┬───────────────────┐
#   │                                                      │ backfill │     reconcile     │
#   ├──────────────────────────────────────────────────────┼──────────┼───────────────────┤
#   │ pose liens neufs (détecteur émet, DB ne l'a pas)     │ ✅       │ ✅                │
#   ├──────────────────────────────────────────────────────┼──────────┼───────────────────┤
#   │ monte relevance (secondary→primary)                  │ ✅       │ ✅                │
#   ├──────────────────────────────────────────────────────┼──────────┼───────────────────┤
#   │ supprime liens stale (DB l'a, détecteur n'émet plus) │ ❌       │ ✅                │
#   ├──────────────────────────────────────────────────────┼──────────┼───────────────────┤
#   │ baisse relevance (primary→secondary)                 │ ❌       │ ✅                │
#   ├──────────────────────────────────────────────────────┼──────────┼───────────────────┤
#   │ touche les tags manuels (admin/user)                 │ non      │ non (manual-safe) │
#   └──────────────────────────────────────────────────────┴──────────┴───────────────────┘
#
# reconcile = DELETE non-manual + ré-INSERT la sortie détecteur (writeTagsForProduct) =
# sync EXACT : add + drop + relevance ↕. backfill = additif/upgrade-only, ne supprime ni
# ne downgrade JAMAIS (sûr — ex. prod prudent). reconcile ⊇ backfill → après un reconcile,
# backfill trouve 0 à insérer (ce qu'on vient de voir).

# Fix tag_products rows violating domain constraints (skincare tagTypes on haircare products). Env: WRITE=1 (apply). TARGET: dev|prod (prod+WRITE → confirm).
[group('catalog')]
catalog-fix-tag-domain:
    #!/usr/bin/env bash
    set -euo pipefail
    source {{justfile_directory()}}/scripts/just/_lib.sh
    TARGET="${TARGET:-dev}"
    target_compose
    if [ "$TARGET" = prod ] && [ -n "${WRITE:-}" ]; then confirm_prod "WRITE (catalog-fix-tag-domain)"; fi
    MODE=$([ -n "${WRITE:-}" ] && echo "WRITE" || echo "dry-run")
    printf "{{CYAN}}catalog-fix-tag-domain ($MODE, $TARGET)...{{NC}}\n"
    $COMPOSE exec -w /app/backend api bun run src/db/seed/maintenance/fix-tag-domain-consistency.ts \
        ${WRITE:+--write}

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

# Explain auto-tag pipeline for one raw INCI (layers/merge/drops/promotion), or --counts catalogue aggregation. Read-only. Env: INCI, KIND (serum), CATEGORY (skincare), COUNTS=1.
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
    else
        if [ -z "${INCI:-}" ]; then
            printf "{{RED}}INCI requis (e.g. INCI=\"aqua, glycerin, niacinamide\" just explain-auto-tags){{NC}}\n"; exit 1
        fi
        printf "{{CYAN}}Explain auto-tags — INCI trace ($TARGET)...{{NC}}\n"
        $COMPOSE exec -w /app/backend api bun run src/features/auto-tagging/runners/explain/main.ts \
            --kind "${KIND:-serum}" --category "${CATEGORY:-skincare}" "$INCI"
    fi

# Sample 60-80 produits stratifié → data/gold-set/annotations.json (idempotent). Env: SAMPLE_SIZE, POSITIVES_PER_TAG, NEGATIVES_PER_TAG, SEED, GOLD_SET_PATH.
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
