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
audit-inci-quality:
    #!/usr/bin/env bash
    set -euo pipefail
    TARGET="${TARGET:-dev}"
    case "$TARGET" in
        dev)  COMPOSE="{{COMPOSE_DEV}}" ;;
        prod) COMPOSE="{{COMPOSE_PROD}}" ;;
        *)    printf "{{RED}}TARGET invalide: dev|prod (got '$TARGET'){{NC}}\n"; exit 1 ;;
    esac
    printf "{{CYAN}}Audit INCI quality ($TARGET)...{{NC}}\n"
    $COMPOSE exec \
        ${FULL:+-e INCI_AUDIT_FULL=1} \
        api bun run src/db/seed/inci/audit-quality.ts
