import '_vars.just'

# Outils INCI — audit qualité corpus.
# Tous les paramètres via env vars.
# TARGET=dev (default) | prod. Read-only, pas de confirmation.
# (Les cleanups one-shot `inci/cleanup/*.ts` se lancent à la main, pas de recipe.)
#
# Exemples:
#   FULL=1 just audit-inci-quality
#   TARGET=prod just audit-inci-quality

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
