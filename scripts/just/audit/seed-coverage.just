# Seed coverage audits — lecture seed TS / corpus, pas la DB live.
# Valident la SOURCE seed (cohérence map↔produits), pas le catalogue. Couverture
# catalogue DB-live (produits sans tag / sans ingrédient) → `just audit-db`.

# Produits seed sans aucun ingrédient associé. Read-only.
[group('audit')]
audit-products-missing-ingredients:
    #!/usr/bin/env bash
    set -euo pipefail
    source {{justfile_directory()}}/scripts/just/_lib.sh
    TARGET="${TARGET:-dev}"
    target_compose
    printf "{{CYAN}}Audit produits sans ingrédients ($TARGET) → .audit-out/db/audit-products-missing-ingredients.$TARGET.md{{NC}}\n"
    $COMPOSE exec -w /app/backend api bun run src/db/seed/maintenance/audit-products-missing-ingredients.ts \
        | tee "$(audit_out audit-products-missing-ingredients)"

# Couverture tag_products seed : orphelins, produits sans tags, groupes vides. Read-only.
[group('audit')]
audit-product-tags-coverage:
    #!/usr/bin/env bash
    set -euo pipefail
    source {{justfile_directory()}}/scripts/just/_lib.sh
    TARGET="${TARGET:-dev}"
    target_compose
    printf "{{CYAN}}Audit couverture tags produits ($TARGET) → .audit-out/db/audit-product-tags-coverage.$TARGET.md{{NC}}\n"
    $COMPOSE exec -w /app/backend api bun run src/db/seed/maintenance/audit-product-tags-coverage.ts \
        | tee "$(audit_out audit-product-tags-coverage)"

# Synchro slugs ingrédients seed : manquants en data, fantômes, doublons. Read-only.
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

# Couverture tags ingrédients seed : ingrédients sans aucun tag. Read-only.
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

# Scanne les produits → doublons, descriptions vides, INCI manquante, casse douteuse. Lecture seule. Env: WRITE → output/imported-products-audit.{json,md} (sinon console).
[group('audit')]
audit-imported-products:
    #!/usr/bin/env bash
    set -euo pipefail
    source {{justfile_directory()}}/scripts/just/_lib.sh
    TARGET="${TARGET:-dev}"
    target_compose
    MODE=$([ -n "${WRITE:-}" ] && echo "WRITE (output/)" || echo "console")
    printf "{{CYAN}}Audit imported products ($MODE, $TARGET)...{{NC}}\n"
    $COMPOSE exec -w /app/backend api bun run src/db/seed/maintenance/audit-imported-products.ts \
        ${WRITE:+--write}

# Audit corpus INCI : tokens non matchés, INCI pathologiques. Env: FULL.
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
