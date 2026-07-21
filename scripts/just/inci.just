import '_vars.just'

# INCI tools: corpus audit + one-shot cleanups + linker.
# All parameters via env vars. TARGET=dev (default) | prod.
# Audits read-only. Cleanups/linker: dry-run by default, WRITE=1 writes (confirm on prod).
#
# Examples:
#   FULL=1 just audit-inci-quality
#   just inci-cleanup clean-inci              # dry-run
#   WRITE=1 just inci-cleanup-all             # writes the 3 cleanups
#   WRITE=1 LIMIT=20 just inci-cleanup resplit-single-token
#   just link-ingredients                     # dry-run link backfill
#   WRITE=1 just link-ingredients             # apply
#   WRITE=1 SLUG=<slug> just link-ingredients # replace links of 1 product

# Backfill product_ingredients from products.inci (products with 0 links).
# Idempotent. Re-run after every ingest. Seed/ingest does NOT link:
# this script is the only path that populates links for imported products.
[doc("Backfill INCI links → product_ingredients. Env: WRITE (omit = dry-run), SLUG (replace 1 product), LIMIT (integer >= 0)")]
[group('inci')]
link-ingredients:
    #!/usr/bin/env bash
    set -euo pipefail
    source {{justfile_directory()}}/scripts/just/_lib.sh
    TARGET="${TARGET:-dev}"
    target_compose
    if [ "$TARGET" = prod ] && [ -n "${WRITE:-}" ]; then confirm_prod "WRITE (link-ingredients)"; fi
    MODE=$([ -n "${WRITE:-}" ] && echo "WRITE" || echo "dry-run")
    printf "{{CYAN}}INCI link-ingredients ($MODE, $TARGET)...{{NC}}\n"
    $COMPOSE exec ${LIMIT:+-e LIMIT="$LIMIT"} -w /app/backend api bun run src/db/seed/inci/link-ingredients/main.ts ${WRITE:+--write} ${SLUG:+--slug "$SLUG"}

# One-shot INCI cleanup. SCRIPT ∈ clean-inci | resplit-single-token | worst-match-prose.
# Dry-run by default; WRITE=1 commits. Env: TARGET, WRITE, LIMIT (resplit).
[doc("One-shot INCI cleanup (clean-inci|resplit-single-token|worst-match-prose). Env: WRITE (omit = dry-run), LIMIT")]
[group('inci')]
inci-cleanup script:
    #!/usr/bin/env bash
    set -euo pipefail
    source {{justfile_directory()}}/scripts/just/_lib.sh
    TARGET="${TARGET:-dev}"
    target_compose
    if [ "$TARGET" = prod ] && [ -n "${WRITE:-}" ]; then confirm_prod "WRITE (inci-cleanup {{script}})"; fi
    MODE=$([ -n "${WRITE:-}" ] && echo "WRITE" || echo "dry-run")
    printf "{{CYAN}}INCI cleanup {{script}} ($MODE, $TARGET)...{{NC}}\n"
    $COMPOSE exec -w /app/backend api bun run src/db/seed/inci/cleanup/{{script}}.ts ${WRITE:+--apply} ${LIMIT:+--limit="$LIMIT"}

# All INCI cleanups in sequence: clean-inci → resplit-single-token → worst-match-prose.
# Dry-run by default; WRITE=1 commits. Run `just db-snapshot` after a WRITE.
[doc("The 3 INCI cleanups in sequence. Env: WRITE (omit = dry-run); db-snapshot after a WRITE")]
[group('inci')]
inci-cleanup-all:
    #!/usr/bin/env bash
    set -euo pipefail
    source {{justfile_directory()}}/scripts/just/_lib.sh
    TARGET="${TARGET:-dev}"
    target_compose
    if [ "$TARGET" = prod ] && [ -n "${WRITE:-}" ]; then confirm_prod "WRITE (inci-cleanup-all)"; fi
    MODE=$([ -n "${WRITE:-}" ] && echo "WRITE" || echo "dry-run")
    for s in clean-inci resplit-single-token worst-match-prose; do
        printf "{{CYAN}}── $s ($MODE, $TARGET) ──{{NC}}\n"
        $COMPOSE exec -w /app/backend api bun run src/db/seed/inci/cleanup/$s.ts ${WRITE:+--apply}
    done
