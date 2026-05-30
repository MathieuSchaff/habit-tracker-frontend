import '_vars.just'
import 'audit.just'

SNAPSHOT_FILE := "backend/src/db/snapshot/data.sql"

# Database recipes.
# TARGET=dev (default) | prod. Confirmation interactive sur prod :
#   - write : tape 'PROD'
#   - destructive (TRUNCATE) : tape 'I DESTROY PROD'
#
# Dev-only par design (schémas locaux, GUI, snapshot dev) :
#   db-push, db-generate, db-studio, db-snapshot, db-snapshot-load, db-snapshot-reset

# ─── Schema (dev-only, host-running) ────────────────────────────────────────

# Apply Drizzle migrations. TARGET-aware (cd backend && export .env.<target>).
db-migrate:
    #!/usr/bin/env bash
    set -euo pipefail
    TARGET="${TARGET:-dev}"
    case "$TARGET" in
        dev)  ENV_FILE="../.env.dev" ;;
        prod) ENV_FILE="../.env.prod" ;;
        *)    printf "{{RED}}TARGET invalide: dev|prod (got '$TARGET'){{NC}}\n"; exit 1 ;;
    esac
    if [ "$TARGET" = "prod" ]; then
        printf "{{RED}}⚠ PROD MIGRATE — tape 'PROD' pour confirmer{{NC}}\n"
        read -r -p "> " C
        [ "$C" = "PROD" ] || { printf "{{RED}}abandon{{NC}}\n"; exit 1; }
    fi
    printf "{{CYAN}}Applying migrations ($TARGET)...{{NC}}\n"
    cd backend && set -a && source "$ENV_FILE" && set +a && bun run src/db/migrate.ts

# Generate migration files from schema (dev-only)
db-generate:
    @printf "{{CYAN}}Generating migration files...{{NC}}\n"
    cd backend && set -a && source ../.env.dev && set +a && bunx drizzle-kit generate

# ⚠️ Bypass migrations — loses FORCE RLS + auth.* (prefer db-migrate). Dev-only.
db-push:
    @printf "{{CYAN}}Schema sync (push)...{{NC}}\n"
    cd backend && set -a && source ../.env.dev && set +a && bunx drizzle-kit push

# Launch Drizzle Studio GUI (dev-only, localhost)
db-studio:
    @printf "{{CYAN}}Launching Drizzle Studio on http://localhost:4983{{NC}}\n"
    cd backend && set -a && source ../.env.dev && set +a && bunx drizzle-kit studio --port 4983

# ─── Stats (read-only) ──────────────────────────────────────────────────────

# DB stats (product/ingredient/tag/user counts). Read-only.
db-stats:
    #!/usr/bin/env bash
    set -euo pipefail
    source {{justfile_directory()}}/scripts/just/_lib.sh
    TARGET="${TARGET:-dev}"
    target_compose
    printf "{{CYAN}}DB stats ($TARGET)...{{NC}}\n"
    $COMPOSE exec api bun run src/db/audit/stats-db.ts

# ─── Seed (write, idempotent) ───────────────────────────────────────────────

# Push CORE seed deltas (idempotent, preserves user-state).
db-seed:
    #!/usr/bin/env bash
    set -euo pipefail
    source {{justfile_directory()}}/scripts/just/_lib.sh
    TARGET="${TARGET:-dev}"
    target_compose
    if [ "$TARGET" = "prod" ]; then
        printf "{{RED}}⚠ PROD SEED — tape 'PROD' pour confirmer{{NC}}\n"
        read -r -p "> " C
        [ "$C" = "PROD" ] || { printf "{{RED}}abandon{{NC}}\n"; exit 1; }
    fi
    printf "{{CYAN}}Pushing CORE seed deltas (idempotent, $TARGET)...{{NC}}\n"
    $COMPOSE exec api bun run src/db/seed/seeders/seed-core.ts
    printf "{{GREEN}}✓ CORE seed deltas pushed ($TARGET){{NC}}\n"

# Alias — idempotent mode is default since Phase 5d
db-seed-merge: db-seed

# Seed + audit (recommended after reseed). Composite, inherits TARGET.
db-seed-safe: db-seed audit-db

# Backup + idempotent delta push + audit. Composite, inherits TARGET.
db-seed-merge-safe: db-backup db-seed-merge audit-db

# ─── Destructive (DOUBLE confirmation on prod) ──────────────────────────────

# ⚠️ Destructive seed (TRUNCATE + reseed). Triple confirmation on prod.
db-seed-reset:
    #!/usr/bin/env bash
    set -euo pipefail
    source {{justfile_directory()}}/scripts/just/_lib.sh
    TARGET="${TARGET:-dev}"
    target_compose
    printf "{{YELLOW}}⚠ ATTENTION: --reset will TRUNCATE products + ingredients + tag relations!\n"
    printf "  If the target DB has more products than the JS seed, the guard will refuse unless SEED_FORCE_RESET=1.{{NC}}\n"
    if [ "$TARGET" = "prod" ]; then
        printf "{{RED}}⚠⚠ PROD RESET — tape 'I DESTROY PROD' pour confirmer{{NC}}\n"
        read -r -p "> " C
        [ "$C" = "I DESTROY PROD" ] || { printf "{{RED}}abandon{{NC}}\n"; exit 1; }
    else
        read -r -p "Confirm full DB reset? [y/N] " C
        [ "$C" = "y" ] || exit 1
    fi
    $COMPOSE exec api bun run src/db/seed/seeders/seed-core.ts --reset
    printf "{{GREEN}}✓ CORE seed (--reset) done ($TARGET){{NC}}\n"

# Wipe DB completely (public schema). Destructive.
db-clean:
    #!/usr/bin/env bash
    set -euo pipefail
    source {{justfile_directory()}}/scripts/just/_lib.sh
    TARGET="${TARGET:-dev}"
    target_compose
    printf "{{YELLOW}}⚠ ATTENTION: All data will be deleted!{{NC}}\n"
    if [ "$TARGET" = "prod" ]; then
        printf "{{RED}}⚠⚠ PROD WIPE — tape 'I DESTROY PROD' pour confirmer{{NC}}\n"
        read -r -p "> " C
        [ "$C" = "I DESTROY PROD" ] || { printf "{{RED}}abandon{{NC}}\n"; exit 1; }
    else
        read -r -p "Confirm local DB wipe? [y/N] " C
        [ "$C" = "y" ] || exit 1
    fi
    $COMPOSE exec -T db psql -U app -d appdb -c "DO \$\$ DECLARE r record; BEGIN FOR r IN (SELECT tablename FROM pg_tables WHERE schemaname='public') LOOP EXECUTE 'TRUNCATE ' || quote_ident(r.tablename) || ' RESTART IDENTITY CASCADE'; END LOOP; END \$\$;"
    printf "{{GREEN}}✓ Database wiped ($TARGET).{{NC}}\n"

# Full reset: wipe + migrate + seed. Composite, inherits TARGET.
db-reset: db-clean db-migrate db-seed

# ─── Backup / restore ───────────────────────────────────────────────────────

# Create SQL backup. Prod = gzip + GPG (recipient backup@aurore.local). Dev = .sql brut.
db-backup:
    #!/usr/bin/env bash
    set -euo pipefail
    source {{justfile_directory()}}/scripts/just/_lib.sh
    TARGET="${TARGET:-dev}"
    target_compose
    mkdir -p ./backups
    TS=$(date +%Y%m%d_%H%M%S)
    if [ "$TARGET" = "prod" ]; then
        BK="./backups/backup_prod_${TS}.sql.gz.gpg"
        $COMPOSE exec -T db pg_dump -U app appdb \
            | gzip \
            | gpg --batch --yes --trust-model always \
                  --encrypt --recipient backup@aurore.local \
                  --output "$BK"
        [ -s "$BK" ] || { printf "{{RED}}Backup vide ou échoué: $BK{{NC}}\n"; exit 1; }
    else
        BK="./backups/backup_${TS}.sql"
        $COMPOSE exec -T db pg_dump -U app appdb > "$BK"
    fi
    printf "{{GREEN}}✓ Backup created ($TARGET): $BK{{NC}}\n"

# Restore a backup. Usage: just db-restore ./backups/xxx.sql
db-restore file:
    #!/usr/bin/env bash
    set -euo pipefail
    source {{justfile_directory()}}/scripts/just/_lib.sh
    TARGET="${TARGET:-dev}"
    target_compose
    if [ "$TARGET" = "prod" ]; then
        printf "{{RED}}⚠⚠ PROD RESTORE from {{file}} — tape 'I DESTROY PROD' pour confirmer{{NC}}\n"
        read -r -p "> " C
        [ "$C" = "I DESTROY PROD" ] || { printf "{{RED}}abandon{{NC}}\n"; exit 1; }
    fi
    printf "{{CYAN}}Restoring {{file}} ($TARGET)...{{NC}}\n"
    # Détecter chiffrement + gzip automatiquement
    case "{{file}}" in
        *.sql.gz.gpg) gpg --batch --decrypt "{{file}}" | gunzip | $COMPOSE exec -T db psql -U app appdb ;;
        *.gz)         gunzip -c "{{file}}" | $COMPOSE exec -T db psql -U app appdb ;;
        *)            $COMPOSE exec -T db psql -U app appdb < "{{file}}" ;;
    esac
    printf "{{GREEN}}✓ Restore done ($TARGET){{NC}}\n"

# [PROD] Alias de `TARGET=prod just db-backup` (gardé pour rétrocompatibilité scripts cron).
db-backup-prod:
    @TARGET=prod just db-backup

# [PROD] Delete backups older than 7 days (.sql.gz.gpg + .sql.gz pour la fenêtre de transition).
db-backup-clean:
    find ./backups \( -name "*.sql.gz.gpg" -o -name "*.sql.gz" \) -mtime +7 -delete
    @printf "{{GREEN}}✓ Old backups deleted{{NC}}\n"

# [PROD] Install daily cron (3am) for backups
backup-cron-install:
    #!/usr/bin/env bash
    printf "{{YELLOW}}Installing backup cron at /etc/cron.d/aurore-backup{{NC}}\n"
    echo "0 3 * * * root cd $(pwd) && just db-backup-prod && just db-backup-clean >> /var/log/aurore-backup.log 2>&1" \
        | sudo tee /etc/cron.d/aurore-backup > /dev/null
    sudo chmod 644 /etc/cron.d/aurore-backup
    printf "{{GREEN}}✓ Cron installed — daily backup at 3am{{NC}}\n"

# ─── Snapshot (dev-only — committable file, dev source of truth) ────────────

# Dump data → backend/src/db/snapshot/data.sql (committable, dev source of truth)
db-snapshot:
    #!/usr/bin/env bash
    mkdir -p backend/src/db/snapshot
    {{COMPOSE_DEV}} exec -T db pg_dump -U app -d appdb \
        --data-only --inserts --no-owner --no-privileges \
        --exclude-schema=drizzle \
        > {{SNAPSHOT_FILE}}
    printf "{{GREEN}}✓ Snapshot written: {{SNAPSHOT_FILE}} ($(wc -l < {{SNAPSHOT_FILE}}) lines, $(du -h {{SNAPSHOT_FILE}} | cut -f1)){{NC}}\n"

# Reload snapshot/data.sql into DB — requires migrated schema. Dev-only.
db-snapshot-load:
    #!/usr/bin/env bash
    if [ ! -f "{{SNAPSHOT_FILE}}" ]; then
        printf "{{RED}}❌ No snapshot at {{SNAPSHOT_FILE}} — run `just db-snapshot` first{{NC}}\n"
        exit 1
    fi
    printf "{{YELLOW}}⚠ TRUNCATE all public tables + reload snapshot{{NC}}\n"
    read -r -p "Confirm? [y/N] " C
    [ "$C" = "y" ] || exit 1
    {{COMPOSE_DEV}} exec -T db psql -U app -d appdb -v ON_ERROR_STOP=1 -c \
        "DO \$\$ DECLARE r record; BEGIN FOR r IN (SELECT tablename FROM pg_tables WHERE schemaname='public') LOOP EXECUTE 'TRUNCATE ' || quote_ident(r.tablename) || ' RESTART IDENTITY CASCADE'; END LOOP; END \$\$;"
    {{COMPOSE_DEV}} exec -T db psql -U app -d appdb -v ON_ERROR_STOP=1 < {{SNAPSHOT_FILE}} > /dev/null
    printf "{{GREEN}}✓ Snapshot loaded{{NC}}\n"

# Clean + migrate + load snapshot (alternative to db-reset which uses seed TS). Dev-only.
db-snapshot-reset: db-clean db-migrate
    {{COMPOSE_DEV}} exec -T db psql -U app -d appdb -v ON_ERROR_STOP=1 < {{SNAPSHOT_FILE}} > /dev/null
    @printf "{{GREEN}}✓ DB reset from snapshot{{NC}}\n"
