import '_vars.just'

# Data ingest (sources externes) + maintenance produits (dédup, audits).
# Tous les paramètres via env vars (préfixées avant `just`).
# TARGET=dev (default) | prod. Confirmation interactive si TARGET=prod + WRITE.
#
# Exemples:
#   WRITE=1 just ingest-peta                          # dev write
#   TARGET=prod just audit-imported-products          # audit prod read-only
#   TARGET=prod REFRESH=1 WRITE=1 just ingest-peta    # prod write (confirmation)

# ─── Ingest ─────────────────────────────────────────────────────────────────

# Sonde PETA marque par marque (~220) → cruelty-free dans brand_certifications. Env: REFRESH (re-fetch), WRITE (applique), STRICT_PRUNE (retire les `peta` périmés).
[group('ingest')]
ingest-peta:
    #!/usr/bin/env bash
    set -euo pipefail
    source {{justfile_directory()}}/scripts/just/_lib.sh
    data_run "Ingest PETA cruelty-free" src/db/seed/ingest/peta-cruelty-free/main.ts \
        ${REFRESH:+--refresh} \
        ${STRICT_PRUNE:+--strict-prune}

# Dump Open Beauty Facts (~17 MB) → agrège claims vegan/cruelty-free/naturel par marque (≥THRESHOLD) → brand_certifications. Env: DOWNLOAD, WRITE, THRESHOLD (déf 0.5), NO_WHITELIST.
[group('ingest')]
ingest-obf:
    #!/usr/bin/env bash
    set -euo pipefail
    source {{justfile_directory()}}/scripts/just/_lib.sh
    data_run "Ingest OBF brand labels" src/db/seed/ingest/obf-brand-labels/main.ts \
        ${DOWNLOAD:+--download} \
        ${THRESHOLD:+--threshold "$THRESHOLD"} \
        ${NO_WHITELIST:+--no-whitelist}

# Récupère des INCI propres sur INCIDecoder pour les produits à INCI faible. 4 phases séquentielles:
#   crawl = liste produits/marque · match = associe aux tiens · fetch = récupère INCI · apply = écrit en DB.
# Usage: just ingest-incidecoder crawl  (puis match, fetch, apply)  ·  TARGET=prod … apply
[doc("Récupère des INCI propres sur INCIDecoder pour les produits à INCI faible (crawl|match|fetch|apply)")]
[group('ingest')]
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
    $COMPOSE exec -w /app/backend api bun run src/db/seed/ingest/incidecoder/main.ts --{{phase}}

# Bulk-create products from a JSONL lot via createProduct (validation + cleanInci + auto-tag).
# Arg = path relative to backend/. Env: WRITE (sans = dry-run), CLASSIFICATIONS (verdicts json),
# SEED_OWNER_EMAIL (owner, défaut seed@seed.com — must pre-exist, never created here),
# ALLOW_PARTIAL (accepte un lot avec blockers — sinon GATE A: exit 1, rien d'écrit).
# Run record → backend/tmp/data-runs/<lot>-<ts>/ (plan.json, apply.jsonl).
# TARGET=prod from the laptop aborts (assert_prod_stack in _lib.sh) — for real prod
# run via `just prod-ssh 'TARGET=prod WRITE=1 just ingest-catalogue …'`.
# Runbook: docs/CATALOGUE_SEEDING.md.
[doc("Bulk-create products from a JSONL lot via createProduct (validation + cleanInci + auto-tag). Env: WRITE, ALLOW_PARTIAL, CLASSIFICATIONS, SEED_OWNER_EMAIL")]
[group('ingest')]
ingest-catalogue jsonl:
    #!/usr/bin/env bash
    set -euo pipefail
    source {{justfile_directory()}}/scripts/just/_lib.sh
    data_run "Ingest catalogue {{jsonl}}" src/db/seed/ingest/catalogue/main.ts {{jsonl}} \
        ${ALLOW_PARTIAL:+--allow-partial} \
        ${CLASSIFICATIONS:+--classifications "$CLASSIFICATIONS"}

# GATE B: full DB audit + CDN⇄DB audit, then snapshot — snapshot ne tourne QUE si
# tout passe (un dep en exit 1 → data.sql non régénéré). Le catalogue ne ship jamais
# avec une DB dev rouge ni des images externes/cassées. Dev-only (db-snapshot lit la dev DB).
[doc("GATE B: full DB audit + CDN⇄DB audit, then snapshot. Dev-only")]
[group('catalog')]
catalogue-gate: audit-db-full audit-cdn db-snapshot

# Happy path catalogue: write du lot (Gate A) puis catalogue-gate (Gate B + snapshot).
# Mêmes env que ingest-catalogue (SEED_OWNER_EMAIL, ALLOW_PARTIAL, CLASSIFICATIONS).
# Dev-only comme catalogue-gate — prod reste `just prod-ssh '… just ingest-catalogue …'`.
[doc("Happy path catalogue: write du lot (Gate A) puis catalogue-gate (Gate B + snapshot). Dev-only")]
[group('catalog')]
catalogue-apply jsonl:
    #!/usr/bin/env bash
    set -euo pipefail
    if [ "${TARGET:-dev}" = prod ]; then
        printf 'catalogue-apply est dev-only (db-snapshot lit la dev DB).\n' >&2
        printf "Prod: just prod-ssh 'TARGET=prod WRITE=1 just ingest-catalogue <lot>'\n" >&2
        exit 1
    fi
    WRITE=1 just ingest-catalogue {{jsonl}}
    just catalogue-gate

# ─── Maintenance produits ───────────────────────────────────────────────────
# audit = rapport seul · dedupe = édite les fichiers seed · scan = lit un dump DB. Aucun n'écrit la DB live.

# Repère le même produit en plusieurs tailles dans les .seed.ts (-400ml, -recharge…) → garde la canonique, supprime les variantes. Édite les seed. Env: WRITE (sans = dry-run).
[group('catalog')]
catalog-dedupe:
    #!/usr/bin/env bash
    set -euo pipefail
    source {{justfile_directory()}}/scripts/just/_lib.sh
    data_run "Dedupe product variants" src/db/seed/maintenance/dedupe-product-variants.ts

# Drop intra-file volume-variant dups in seed (keep largest volume). Pre-req: audit-imported-products. Env: WRITE (sans = dry-run).
[group('catalog')]
catalog-canonicalize:
    #!/usr/bin/env bash
    set -euo pipefail
    source {{justfile_directory()}}/scripts/just/_lib.sh
    data_run "Canonicalize volume variants" src/db/seed/maintenance/canonicalize-volume-variants.ts

# Append slug-tail to colliding (name,brand) seed entries w/o volume suffix. Env: WRITE (sans = dry-run).
[group('catalog')]
catalog-disambiguate:
    #!/usr/bin/env bash
    set -euo pipefail
    source {{justfile_directory()}}/scripts/just/_lib.sh
    data_run "Disambiguate product names" src/db/seed/maintenance/disambiguate-product-names.ts

# Scanne un dump SQL (COPY ou INSERT/--inserts) → 4 signaux de doublons:
#   slug avec faute · kits/lots · INCI quasi-identiques même marque · paires base+recharge.
# Arg = path relatif backend/ (déf = snapshot commité), ex: just catalog-scan-dups src/db/my-dump.sql
[doc("Scanne un dump SQL → 4 signaux de doublons (slug avec faute, kits/lots, INCI quasi-identiques, base+recharge). Read-only")]
[group('catalog')]
catalog-scan-dups backup="src/db/snapshot/data.sql":
    #!/usr/bin/env bash
    set -euo pipefail
    source {{justfile_directory()}}/scripts/just/_lib.sh
    TARGET="${TARGET:-dev}"
    target_compose
    printf "{{CYAN}}Scan DB duplicates from {{backup}} ($TARGET)...{{NC}}\n"
    $COMPOSE exec -w /app/backend api bun run src/db/seed/maintenance/scan-db-duplicates.ts {{backup}}

# Backfill ingredients.canonical_key from algo-derm evidence (substance identity).
# Re-run after a fresh `db-seed`/`db-reset` (seed leaves it NULL) or an algo-derm bump.
# Env: WRITE (sans = dry-run). Persist with `db-snapshot` after.
[doc("Backfill ingredients.canonical_key from algo-derm evidence. Env: WRITE (sans = dry-run)")]
[group('catalog')]
catalog-backfill-canonical-key:
    #!/usr/bin/env bash
    set -euo pipefail
    source {{justfile_directory()}}/scripts/just/_lib.sh
    data_run "Backfill canonical_key" src/db/seed/maintenance/backfill-canonical-key.ts

# Rewrite products.inci to governed canonical form (algo-derm cleanInci → canonical).
# Shares normalizeInci with the create/update write path. Env: WRITE (sans = dry-run).
# Persist with `db-snapshot` after a WRITE.
[doc("Rewrite products.inci to governed canonical form (algo-derm cleanInci). Env: WRITE (sans = dry-run)")]
[group('catalog')]
catalog-normalize-inci:
    #!/usr/bin/env bash
    set -euo pipefail
    source {{justfile_directory()}}/scripts/just/_lib.sh
    data_run "Normalize products.inci" src/db/seed/maintenance/normalize-product-inci.ts

# Soft-hide (default) or delete bundles (coffret/kit/gift-set/trio-set/lot-de-N), not standalone formulas.
# Slug regex shared with catalog-scan-dups. Idempotent — safe to re-run after new imports.
# Env: WRITE (omit for dry-run), DELETE (hard delete instead of soft-hide). TARGET=prod from the laptop
# aborts (assert_prod_stack) — for real prod run via `just prod-ssh 'TARGET=prod WRITE=1 DELETE=1 just catalog-hide-kit-packs'`.
[doc("Soft-hide/delete bundle products (coffret/kit/gift-set/trio-set/lot-de-N). Idempotent. Env: WRITE (omit for dry-run), DELETE")]
[group('catalog')]
catalog-hide-kit-packs:
    #!/usr/bin/env bash
    set -euo pipefail
    source {{justfile_directory()}}/scripts/just/_lib.sh
    data_run "Hide kit/pack products" src/db/seed/maintenance/hide-kit-pack-products.ts ${DELETE:+--delete}
