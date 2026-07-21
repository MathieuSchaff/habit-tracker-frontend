# Live DB consistency / security / CDN-ref integrity audits (read-only).

# Audit DB consistency (seed drift, relational integrity); full untruncated report → .audit-out/db/audit-db.$TARGET.md.
[group('audit')]
audit-db:
    #!/usr/bin/env bash
    set -euo pipefail
    source {{justfile_directory()}}/scripts/just/_lib.sh
    TARGET="${TARGET:-dev}"
    target_compose
    printf "{{CYAN}}DB audit ($TARGET) → .audit-out/db/audit-db.$TARGET.md{{NC}}\n"
    $COMPOSE exec -e AUDIT_DB_FULL=1 -w /app/backend api bun run src/db/audit/audit-db.ts \
        | tee "$(audit_out audit-db)"

# Taxonomy-coherence audit (read-only): absence-claims on implausible kinds, product-type axis leak, concern⇄effect duplication. Info-only.
[group('audit')]
audit-taxonomy:
    #!/usr/bin/env bash
    set -euo pipefail
    source {{justfile_directory()}}/scripts/just/_lib.sh
    TARGET="${TARGET:-dev}"
    target_compose
    printf "{{CYAN}}Taxonomy audit ($TARGET) → .audit-out/db/audit-taxonomy.$TARGET.md{{NC}}\n"
    $COMPOSE exec -w /app/backend api bun run src/db/audit/audit-taxonomy.ts \
        | tee "$(audit_out audit-taxonomy)"

# Scan DB rows for suspicious URLs / HTML injection; exit 1 on high-severity. Env: WRITE=1 (auto-fix), CSV_OUT (export). TARGET: dev|prod (prod+WRITE → confirm).
[group('audit')]
audit-security:
    #!/usr/bin/env bash
    set -euo pipefail
    source {{justfile_directory()}}/scripts/just/_lib.sh
    TARGET="${TARGET:-dev}"
    target_compose
    if [ "$TARGET" = prod ] && [ -n "${WRITE:-}" ]; then confirm_prod "WRITE (audit-security)"; fi
    MODE=$([ -n "${WRITE:-}" ] && echo "WRITE" || echo "dry-run")
    printf "{{CYAN}}Security audit ($MODE, $TARGET) → .audit-out/db/audit-security.$TARGET.md{{NC}}\n"
    $COMPOSE exec \
        ${WRITE:+-e WRITE="$WRITE"} \
        ${CSV_OUT:+-e CSV_OUT="$CSV_OUT"} \
        -w /app/backend api bun run src/db/audit/audit-security.ts \
        | tee "$(audit_out audit-security)"

# Authoritative CDN⇄DB audit: Bunny orphans, broken DB refs, reachability sample. Read-only.
[group('audit')]
audit-cdn:
    #!/usr/bin/env bash
    set -euo pipefail
    source {{justfile_directory()}}/scripts/just/_lib.sh
    TARGET="${TARGET:-dev}"
    target_compose
    printf "{{CYAN}}Audit CDN⇄DB ($TARGET) → .audit-out/db/audit-cdn.$TARGET.md{{NC}}\n"
    $COMPOSE exec -w /app/backend api bun run src/images/audit/bunny.ts \
        | tee "$(audit_out audit-cdn)"
