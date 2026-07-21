# Seed/corpus coverage audits. Product coverage on the live catalogue
# (without tags / ingredients) lives in `just audit-db`; the ingredient-tag
# audit below is the one DB-live exception in this file.

# Seed ingredient slug sync: missing in data, ghosts, duplicates. Read-only.
[group('audit')]
audit-ingredients-sync:
    #!/usr/bin/env bash
    set -euo pipefail
    source {{justfile_directory()}}/scripts/just/_lib.sh
    TARGET="${TARGET:-dev}"
    target_compose
    printf "{{CYAN}}Audit synchro ingrédients ($TARGET) → .audit-out/db/audit-ingredients-sync.$TARGET.md{{NC}}\n"
    $COMPOSE exec -w /app/backend api bun run src/db/seed/maintenance/audit-ingredients-sync.ts \
        | tee "$(audit_out audit-ingredients-sync)"

# Live-DB ingredient tag coverage: ingredients with no tag at all. Read-only.
[group('audit')]
audit-ingredient-tags-coverage:
    #!/usr/bin/env bash
    set -euo pipefail
    source {{justfile_directory()}}/scripts/just/_lib.sh
    TARGET="${TARGET:-dev}"
    target_compose
    printf "{{CYAN}}Audit couverture tags ingrédients ($TARGET) → .audit-out/db/audit-ingredient-tags-coverage.$TARGET.md{{NC}}\n"
    $COMPOSE exec -w /app/backend api bun run src/db/seed/maintenance/audit-ingredient-tags-coverage.ts \
        | tee "$(audit_out audit-ingredient-tags-coverage)"

# INCI corpus audit: unmatched tokens, pathological INCI. Env: FULL.
[group('audit')]
audit-inci-quality:
    #!/usr/bin/env bash
    set -euo pipefail
    source {{justfile_directory()}}/scripts/just/_lib.sh
    TARGET="${TARGET:-dev}"
    target_compose
    printf "{{CYAN}}Audit INCI quality ($TARGET)...{{NC}}\n"
    $COMPOSE exec \
        ${FULL:+-e INCI_AUDIT_FULL=1} \
        -w /app/backend api bun run src/db/seed/inci/audit-quality.ts
