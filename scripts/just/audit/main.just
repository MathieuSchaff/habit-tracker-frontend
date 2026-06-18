import '../_vars.just'
import 'db.just'
import 'auto-tagging.just'
import 'seed-coverage.just'
import 'autotag-ops.just'
import 'code.just'

# Audit DB + auto-tagging pipeline (audits + backfill + gold-set).
# TARGET: env var (dev par défaut | prod). Confirmation interactive si TARGET=prod + write/apply.
# Tous les autres paramètres passent par env vars (pas de positional bugué).
#
# Exemples:
#   LIMIT=50 just audit-actif-class
#   SLUG=la-roche-posay WRITE=1 just audit-product-kinds
#   CSV_OUT=/tmp/orch.csv just audit-orchestrator-diff
#   TARGET=prod WRITE=1 just backfill-auto-tags     # prod, confirmation requise
#   just audit-db-full                               # tous les audits read-only d'un coup

# Run all read-only DB audits in sequence; never aborts mid-run, exits 1 if any failed. TARGET: dev|prod.
[group('audit')]
audit-db-full:
    #!/usr/bin/env bash
    set -uo pipefail
    source {{justfile_directory()}}/scripts/just/_lib.sh
    export TARGET="${TARGET:-dev}"
    audits=(audit-db audit-taxonomy audit-security audit-product-kinds audit-actif-class
        audit-kind-inci audit-sans-sulfates audit-aha-bha-pha audit-auto-tags
        audit-auto-tags-check audit-gold-set audit-concentration-solver)
    summary="$(audit_out audit-db-full)"
    { printf '# audit-db-full (%s)\n\n' "$TARGET"; printf '| audit | statut |\n|---|---|\n'; } > "$summary"
    fail=0
    for a in "${audits[@]}"; do
        printf "\n{{CYAN}}━━ %s ━━{{NC}}\n" "$a"
        if just "$a"; then st="✅ ok"; else st="🔴 FAIL"; fail=1; fi
        printf '| %s | %s |\n' "$a" "$st" >> "$summary"
    done
    printf "\n{{CYAN}}Résumé ($TARGET) → %s{{NC}}\n" "$summary"
    cat "$summary"
    exit $fail
