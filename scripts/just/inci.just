import '_vars.just'

# Outils INCI — audit corpus + cleanups one-shot.
# Tous les paramètres via env vars. TARGET=dev (default) | prod.
# Audits read-only. Cleanups: dry-run par défaut, APPLY=1 écrit (confirm sur prod).
#
# Exemples:
#   FULL=1 just audit-inci-quality
#   just inci-cleanup clean-inci              # dry-run
#   APPLY=1 just inci-cleanup-all             # écrit les 3 cleanups
#   APPLY=1 LIMIT=20 just inci-cleanup resplit-single-token

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
        api bun run src/db/seed/inci/audit-quality.ts

# Cleanup INCI one-shot. SCRIPT ∈ clean-inci | resplit-single-token | worst-match-prose.
# Dry-run par défaut; APPLY=1 commit. Env: TARGET, APPLY, LIMIT (resplit).
[group('inci')]
inci-cleanup script:
    #!/usr/bin/env bash
    set -euo pipefail
    source {{justfile_directory()}}/scripts/just/_lib.sh
    TARGET="${TARGET:-dev}"
    target_compose
    if [ "$TARGET" = prod ] && [ -n "${APPLY:-}" ]; then confirm_prod "APPLY (inci-cleanup {{script}})"; fi
    MODE=$([ -n "${APPLY:-}" ] && echo "APPLY" || echo "dry-run")
    printf "{{CYAN}}INCI cleanup {{script}} ($MODE, $TARGET)...{{NC}}\n"
    $COMPOSE exec api bun run src/db/seed/inci/cleanup/{{script}}.ts ${APPLY:+--apply} ${LIMIT:+--limit="$LIMIT"}

# Tous les cleanups INCI en séquence : clean-inci → resplit-single-token → worst-match-prose.
# Dry-run par défaut; APPLY=1 commit. Lance `just db-snapshot` après un APPLY.
[group('inci')]
inci-cleanup-all:
    #!/usr/bin/env bash
    set -euo pipefail
    source {{justfile_directory()}}/scripts/just/_lib.sh
    TARGET="${TARGET:-dev}"
    target_compose
    if [ "$TARGET" = prod ] && [ -n "${APPLY:-}" ]; then confirm_prod "APPLY (inci-cleanup-all)"; fi
    MODE=$([ -n "${APPLY:-}" ] && echo "APPLY" || echo "dry-run")
    for s in clean-inci resplit-single-token worst-match-prose; do
        printf "{{CYAN}}── $s ($MODE, $TARGET) ──{{NC}}\n"
        $COMPOSE exec api bun run src/db/seed/inci/cleanup/$s.ts ${APPLY:+--apply}
    done
