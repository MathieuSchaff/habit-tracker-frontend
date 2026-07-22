import '_vars.just'

# Data ingest (external sources) + product maintenance (dedup, audits).
# All parameters via env vars (prefixed before `just`).
# TARGET=dev (default) | prod. Interactive confirmation when TARGET=prod + WRITE.
#
# Examples:
#   WRITE=1 just ingest-peta                          # dev write
#   TARGET=prod REFRESH=1 WRITE=1 just ingest-peta    # prod write (confirmation)

# Probe PETA brand by brand (~220) → cruelty-free into brand_certifications. Env: REFRESH (re-fetch), WRITE (apply), STRICT_PRUNE (drop stale `peta` rows).
[group('ingest')]
ingest-peta:
    #!/usr/bin/env bash
    set -euo pipefail
    source {{justfile_directory()}}/scripts/just/_lib.sh
    data_run "Ingest PETA cruelty-free" src/db/seed/ingest/peta-cruelty-free/main.ts \
        ${REFRESH:+--refresh} \
        ${STRICT_PRUNE:+--strict-prune}

# Open Beauty Facts dump (~17 MB) → aggregate vegan/cruelty-free/natural claims per brand (≥THRESHOLD) → brand_certifications. Env: DOWNLOAD, WRITE, THRESHOLD (default 0.5), NO_WHITELIST.
[group('ingest')]
ingest-obf:
    #!/usr/bin/env bash
    set -euo pipefail
    source {{justfile_directory()}}/scripts/just/_lib.sh
    data_run "Ingest OBF brand labels" src/db/seed/ingest/obf-brand-labels/main.ts \
        ${DOWNLOAD:+--download} \
        ${THRESHOLD:+--threshold "$THRESHOLD"} \
        ${NO_WHITELIST:+--no-whitelist}

# Fetch clean INCI from INCIDecoder for weak-INCI products. 4 sequential phases:
#   crawl = list products per brand · match = pair with ours · fetch = pull INCI · apply = write DB.
# Usage: just ingest-incidecoder crawl  (then match, fetch, apply)  ·  TARGET=prod … apply
[doc("Fetch clean INCI from INCIDecoder for weak-INCI products (crawl|match|fetch|apply)")]
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
# Arg = path relative to backend/. Env: WRITE (omit = dry-run), CLASSIFICATIONS (verdicts json),
# SEED_OWNER_EMAIL (owner, default seed@seed.com, must pre-exist, never created here),
# ALLOW_PARTIAL (accept a lot with blockers, else GATE A: exit 1, nothing written).
# Run record → backend/tmp/data-runs/<lot>-<ts>/ (plan.json, apply.jsonl).
# TARGET=prod from the laptop aborts (assert_prod_stack in _lib.sh). For real prod
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

# GATE B: full DB audit + CDN⇄DB audit, then snapshot. Snapshot runs ONLY if
# everything passes (any dep exiting 1 → data.sql not regenerated). The catalogue
# never ships with a red dev DB or external/broken images. Dev-only (db-snapshot reads the dev DB).
[doc("GATE B: full DB audit + CDN⇄DB audit, then snapshot. Dev-only")]
[group('catalog')]
catalogue-gate: audit-db-full audit-cdn db-snapshot

# Catalogue happy path: write the lot (Gate A) then catalogue-gate (Gate B + snapshot).
# Same env as ingest-catalogue (SEED_OWNER_EMAIL, ALLOW_PARTIAL, CLASSIFICATIONS).
# Dev-only like catalogue-gate. Prod stays `just prod-ssh '… just ingest-catalogue …'`.
[doc("Catalogue happy path: write the lot (Gate A) then catalogue-gate (Gate B + snapshot). Dev-only")]
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

# scan = reads a SQL dump · backfill/normalize/hide = write the DB with WRITE=1 (dry-run otherwise).

# Scan a SQL dump (COPY or INSERT/--inserts) → 4 duplicate signals:
#   misspelled slug · kits/lots · near-identical INCI same brand · base+refill pairs.
# Arg = path relative to backend/ (default = committed snapshot), ex: just catalog-scan-dups src/db/my-dump.sql
[doc("Scan a SQL dump → 4 duplicate signals (misspelled slug, kits/lots, near-identical INCI, base+refill). Read-only")]
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
# Env: WRITE (omit = dry-run). Persist with `db-snapshot` after.
[doc("Backfill ingredients.canonical_key from algo-derm evidence. Env: WRITE (omit = dry-run)")]
[group('catalog')]
catalog-backfill-canonical-key:
    #!/usr/bin/env bash
    set -euo pipefail
    source {{justfile_directory()}}/scripts/just/_lib.sh
    data_run "Backfill canonical_key" src/db/seed/maintenance/backfill-canonical-key.ts

# Backfill ingredient_dermo_profiles (comedogenicity, functions) from algo-derm
# evidence, joined via canonical_key. Run catalog-backfill-canonical-key first.
# Re-run after an algo-derm bump. Env: WRITE (omit = dry-run). Persist with `db-snapshot`.
[doc("Backfill ingredient_dermo_profiles (comedogenicity, functions) from algo-derm evidence. Env: WRITE (omit = dry-run)")]
[group('catalog')]
catalog-backfill-dermo-profiles:
    #!/usr/bin/env bash
    set -euo pipefail
    source {{justfile_directory()}}/scripts/just/_lib.sh
    data_run "Backfill dermo profiles" src/db/seed/maintenance/backfill-dermo-profiles.ts

# Rewrite products.inci to governed canonical form (algo-derm cleanInci → canonical).
# Shares normalizeInci with the create/update write path. Env: WRITE (omit = dry-run).
# Persist with `db-snapshot` after a WRITE.
[doc("Rewrite products.inci to governed canonical form (algo-derm cleanInci). Env: WRITE (omit = dry-run)")]
[group('catalog')]
catalog-normalize-inci:
    #!/usr/bin/env bash
    set -euo pipefail
    source {{justfile_directory()}}/scripts/just/_lib.sh
    data_run "Normalize products.inci" src/db/seed/maintenance/normalize-product-inci.ts

# Soft-hide (default) or delete bundles (coffret/kit/gift-set/trio-set/lot-de-N), not standalone formulas.
# Slug regex shared with catalog-scan-dups. Idempotent, safe to re-run after new imports.
# Env: WRITE (omit for dry-run), DELETE (hard delete instead of soft-hide). TARGET=prod from the laptop
# aborts (assert_prod_stack). For real prod run via `just prod-ssh 'TARGET=prod WRITE=1 DELETE=1 just catalog-hide-kit-packs'`.
[doc("Soft-hide/delete bundle products (coffret/kit/gift-set/trio-set/lot-de-N). Idempotent. Env: WRITE (omit for dry-run), DELETE")]
[group('catalog')]
catalog-hide-kit-packs:
    #!/usr/bin/env bash
    set -euo pipefail
    source {{justfile_directory()}}/scripts/just/_lib.sh
    data_run "Hide kit/pack products" src/db/seed/maintenance/hide-kit-pack-products.ts ${DELETE:+--delete}
