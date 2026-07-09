import '_vars.just'

# Outils INCI — audit corpus + cleanups one-shot.
# Tous les paramètres via env vars. TARGET=dev (default) | prod.
# Audits read-only. Cleanups: dry-run par défaut, WRITE=1 écrit (confirm sur prod).
#
# Exemples:
#   FULL=1 just audit-inci-quality
#   just inci-cleanup clean-inci              # dry-run
#   WRITE=1 just inci-cleanup-all             # écrit les 3 cleanups
#   WRITE=1 LIMIT=20 just inci-cleanup resplit-single-token

# Cleanup INCI one-shot. SCRIPT ∈ clean-inci | resplit-single-token | worst-match-prose.
# Dry-run par défaut; WRITE=1 commit. Env: TARGET, WRITE, LIMIT (resplit).
[doc("Cleanup INCI one-shot (clean-inci|resplit-single-token|worst-match-prose). Env: WRITE (sans = dry-run), LIMIT")]
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

# Tous les cleanups INCI en séquence : clean-inci → resplit-single-token → worst-match-prose.
# Dry-run par défaut; WRITE=1 commit. Lance `just db-snapshot` après un WRITE.
[doc("Les 3 cleanups INCI en séquence. Env: WRITE (sans = dry-run); db-snapshot après un WRITE")]
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
