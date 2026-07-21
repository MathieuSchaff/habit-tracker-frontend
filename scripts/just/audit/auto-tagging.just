# Auto-tagging audits (read-only dry-runs against algo-derm + formula passes).

# Dry-run auto-tagging via algo-derm (read-only). Env: CONF_OVERRIDE, CSV_OUT, LIMIT, INCLUDE_DROPPED, DUMP_BUDGETS, CHECK, DUMP_BENEFITS, BENEFITS_OUT, DISABLE_FLOORS.
[group('audit')]
audit-auto-tags:
    #!/usr/bin/env bash
    set -euo pipefail
    source {{justfile_directory()}}/scripts/just/_lib.sh
    TARGET="${TARGET:-dev}"
    target_compose
    printf "{{CYAN}}Audit auto-tags dry-run ($TARGET) → .audit-out/db/audit-auto-tags.$TARGET.md{{NC}}\n"
    $COMPOSE exec \
        ${CONF_OVERRIDE:+-e CONF_OVERRIDE="$CONF_OVERRIDE"} \
        ${CSV_OUT:+-e CSV_OUT="$CSV_OUT"} \
        ${LIMIT:+-e LIMIT="$LIMIT"} \
        ${INCLUDE_DROPPED:+-e INCLUDE_DROPPED="$INCLUDE_DROPPED"} \
        ${DUMP_BUDGETS:+-e DUMP_BUDGETS="$DUMP_BUDGETS"} \
        ${CHECK:+-e CHECK="$CHECK"} \
        ${DUMP_BENEFITS:+-e DUMP_BENEFITS="$DUMP_BENEFITS"} \
        ${BENEFITS_OUT:+-e BENEFITS_OUT="$BENEFITS_OUT"} \
        ${DISABLE_FLOORS:+-e DISABLE_FLOORS="$DISABLE_FLOORS"} \
        -w /app/backend api bun run src/features/auto-tagging/runners/audit/main.ts \
        | tee "$(audit_out audit-auto-tags)"

# Calibration drift: hit_rate per (slug,category) vs TAG_HIT_RATE_BUDGET; exit 1 on FAIL, out-of-budget → WARN (warn-only, roadmap A3).
[group('audit')]
audit-auto-tags-check:
    #!/usr/bin/env bash
    set -euo pipefail
    source {{justfile_directory()}}/scripts/just/_lib.sh
    TARGET="${TARGET:-dev}"
    target_compose
    printf "{{CYAN}}Audit auto-tags CHECK ($TARGET) → .audit-out/db/audit-auto-tags-check.$TARGET.md{{NC}}\n"
    $COMPOSE exec -e CHECK=1 -w /app/backend api bun run src/features/auto-tagging/runners/audit/main.ts \
        | tee "$(audit_out audit-auto-tags-check)"

# Detect kind mistags the name-regex misses, via INCI signal (wash kind w/o surfactant). Read-only, report-only.
[group('audit')]
audit-kind-inci:
    #!/usr/bin/env bash
    set -euo pipefail
    source {{justfile_directory()}}/scripts/just/_lib.sh
    TARGET="${TARGET:-dev}"
    target_compose
    printf "{{CYAN}}Audit kind⇄INCI coherence ($TARGET) → .audit-out/db/audit-kind-inci.$TARGET.md{{NC}}\n"
    $COMPOSE exec -w /app/backend api bun run src/features/auto-tagging/runners/audit/kind-inci-coherence.ts \
        | tee "$(audit_out audit-kind-inci)"

# Detect sans-sulfates false negatives: leave-on products denied the claim by a cetearyl/coceth emulsifier. Read-only.
[group('audit')]
audit-sans-sulfates:
    #!/usr/bin/env bash
    set -euo pipefail
    source {{justfile_directory()}}/scripts/just/_lib.sh
    TARGET="${TARGET:-dev}"
    target_compose
    printf "{{CYAN}}Audit sans-sulfates coherence ($TARGET) → .audit-out/db/audit-sans-sulfates.$TARGET.md{{NC}}\n"
    $COMPOSE exec -w /app/backend api bun run src/features/auto-tagging/runners/audit/sans-sulfates-coherence.ts \
        | tee "$(audit_out audit-sans-sulfates)"

# Audit products.kind mistags via name patterns. Read-only. Apply reviewed fixes via `just db-fix`. Env: SLUG (single product).
[group('audit')]
audit-product-kinds:
    #!/usr/bin/env bash
    set -euo pipefail
    source {{justfile_directory()}}/scripts/just/_lib.sh
    TARGET="${TARGET:-dev}"
    target_compose
    printf "{{CYAN}}Audit product kinds (read-only, $TARGET) → .audit-out/db/audit-product-kinds.$TARGET.md{{NC}}\n"
    $COMPOSE exec -w /app/backend api bun run src/features/auto-tagging/runners/audit/product-kinds.ts \
        ${SLUG:+--slug "$SLUG"} \
        | tee "$(audit_out audit-product-kinds)"

# Snapshot/diff orchestrator output. Env: CSV_OUT (required), BASELINE, LIMIT.
[group('audit')]
audit-orchestrator-diff:
    #!/usr/bin/env bash
    set -euo pipefail
    if [ -z "${CSV_OUT:-}" ]; then
        printf "{{RED}}CSV_OUT requis (e.g. CSV_OUT=/tmp/out.csv just audit-orchestrator-diff){{NC}}\n"; exit 1
    fi
    source {{justfile_directory()}}/scripts/just/_lib.sh
    TARGET="${TARGET:-dev}"
    target_compose
    MODE=$([ -n "${BASELINE:-}" ] && echo "DIFF" || echo "SNAPSHOT")
    printf "{{CYAN}}Audit orchestrator ($MODE, $TARGET)...{{NC}}\n"
    $COMPOSE exec \
        -e CSV_OUT="$CSV_OUT" \
        ${BASELINE:+-e BASELINE="$BASELINE"} \
        ${LIMIT:+-e LIMIT="$LIMIT"} \
        -w /app/backend api bun run src/features/auto-tagging/runners/audit/orchestrator-diff.ts

# Dry-run pharmacological cluster audit (pass 2). Env: LIMIT.
[group('audit')]
audit-actif-class:
    #!/usr/bin/env bash
    set -euo pipefail
    source {{justfile_directory()}}/scripts/just/_lib.sh
    TARGET="${TARGET:-dev}"
    target_compose
    printf "{{CYAN}}Audit actif-class dry-run ($TARGET) → .audit-out/db/audit-actif-class.$TARGET.md{{NC}}\n"
    $COMPOSE exec \
        ${LIMIT:+-e LIMIT="$LIMIT"} \
        ${DUMP_DRIFT:+-e DUMP_DRIFT="$DUMP_DRIFT"} \
        ${DUMP_NEW:+-e DUMP_NEW="$DUMP_NEW"} \
        -w /app/backend api bun run src/features/auto-tagging/runners/audit/actif-class.ts \
        | tee "$(audit_out audit-actif-class)"

# Audit AHA/BHA/PHA manual overrides. Env: CSV_OUT, CSV_DIR, LIMIT, WRITE (destructive), APPLY_FROM_CSV.
[group('audit')]
audit-aha-bha-pha:
    #!/usr/bin/env bash
    set -euo pipefail
    source {{justfile_directory()}}/scripts/just/_lib.sh
    TARGET="${TARGET:-dev}"
    target_compose
    if [ -n "${WRITE:-}" ]; then
        printf "{{RED}}⚠ WRITE mode ($TARGET) — DELETE pairs from ${APPLY_FROM_CSV:-?}{{NC}}\n"
        if [ "$TARGET" = prod ]; then confirm_prod "DESTRUCTIVE (aha-bha-pha)"; fi
    else
        printf "{{CYAN}}Audit AHA/BHA/PHA overrides read-only ($TARGET) → .audit-out/db/audit-aha-bha-pha.$TARGET.md{{NC}}\n"
    fi
    $COMPOSE exec \
        ${CSV_OUT:+-e CSV_OUT="$CSV_OUT"} \
        ${CSV_DIR:+-e CSV_DIR="$CSV_DIR"} \
        ${LIMIT:+-e LIMIT="$LIMIT"} \
        ${WRITE:+-e APPLY=1} \
        ${APPLY_FROM_CSV:+-e APPLY_FROM_CSV="$APPLY_FROM_CSV"} \
        -w /app/backend api bun run src/features/auto-tagging/runners/audit/aha-bha-pha-overrides.ts \
        | tee "$(audit_out audit-aha-bha-pha)"

# Benchmark orchestrator vs gold-set (precision/recall/Brier/ECE per tag). Env: GOLD_SET_PATH, CSV_OUT, STRICT.
[group('audit')]
audit-gold-set:
    #!/usr/bin/env bash
    set -euo pipefail
    source {{justfile_directory()}}/scripts/just/_lib.sh
    TARGET="${TARGET:-dev}"
    target_compose
    printf "{{CYAN}}Gold-set benchmark ($TARGET) → .audit-out/db/audit-gold-set.$TARGET.md{{NC}}\n"
    $COMPOSE exec \
        ${GOLD_SET_PATH:+-e GOLD_SET_PATH="$GOLD_SET_PATH"} \
        ${CSV_OUT:+-e CSV_OUT="$CSV_OUT"} \
        ${STRICT:+-e STRICT="$STRICT"} \
        -w /app/backend api bun run src/features/auto-tagging/runners/audit/gold-set.ts \
        | tee "$(audit_out audit-gold-set)"

# Audit algo-derm concentration solver vs brand-claim % (product_ingredients.concentration_value); per-slug + global MAE/RMSE + CI coverage. Env: JSON_OUT, SLUG.
[group('audit')]
audit-concentration-solver:
    #!/usr/bin/env bash
    set -euo pipefail
    source {{justfile_directory()}}/scripts/just/_lib.sh
    TARGET="${TARGET:-dev}"
    target_compose
    printf "{{CYAN}}Concentration solver audit ($TARGET) → .audit-out/db/audit-concentration-solver.$TARGET.md{{NC}}\n"
    $COMPOSE exec \
        ${JSON_OUT:+-e JSON_OUT="$JSON_OUT"} \
        ${SLUG:+-e SLUG="$SLUG"} \
        -w /app/backend api bun run src/features/auto-tagging/runners/audit/concentration-solver.ts \
        | tee "$(audit_out audit-concentration-solver)"
