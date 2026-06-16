import '_vars.just'
import 'audit.just'

# Database recipes.
# TARGET=dev (default) | prod. Confirmation interactive sur prod :
#   - write : tape 'PROD'
#   - destructive (TRUNCATE) : tape 'I DESTROY PROD'
#
# Dev-only par design (schémas locaux, GUI, snapshot dev) :
#   db-push, db-generate, db-studio, db-snapshot, db-snapshot-load, db-snapshot-reset

# ─── Schema (dev-only, host-running) ────────────────────────────────────────

# Apply Drizzle migrations. TARGET-aware (cd backend && export .env.<target>).
[group('db')]
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
[group('db')]
db-generate:
    @printf "{{CYAN}}Generating migration files...{{NC}}\n"
    cd backend && set -a && source ../.env.dev && set +a && bunx drizzle-kit generate

# ⚠️ Bypass migrations — loses FORCE RLS + auth.* (prefer db-migrate). Dev-only.
[group('db')]
db-push:
    @printf "{{CYAN}}Schema sync (push)...{{NC}}\n"
    cd backend && set -a && source ../.env.dev && set +a && bunx drizzle-kit push

# Launch Drizzle Studio GUI (dev-only, localhost)
[group('db')]
db-studio:
    @printf "{{CYAN}}Launching Drizzle Studio on http://localhost:4983{{NC}}\n"
    cd backend && set -a && source ../.env.dev && set +a && bunx drizzle-kit studio --port 4983

# ─── Stats (read-only) ──────────────────────────────────────────────────────

# DB stats (product/ingredient/tag/user counts). Read-only.
[group('db')]
db-stats:
    #!/usr/bin/env bash
    set -euo pipefail
    source {{justfile_directory()}}/scripts/just/_lib.sh
    TARGET="${TARGET:-dev}"
    target_compose
    printf "{{CYAN}}DB stats ($TARGET)...{{NC}}\n"
    $COMPOSE exec -w /app/backend api bun run src/db/audit/stats-db.ts

# ─── Seed (write, idempotent) ───────────────────────────────────────────────

# Push CORE seed deltas (idempotent, preserves user-state).
[group('db')]
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
    LOG="{{justfile_directory()}}/.audit-out/db/seed.log"
    mkdir -p "$(dirname "$LOG")"
    printf "{{CYAN}}Pushing CORE seed deltas (idempotent, $TARGET)...{{NC}}\n"
    $COMPOSE exec -w /app/backend api bun run src/db/seed/seeders/seed-core.ts 2>&1 | tee "$LOG"
    # seed leaves ingredients.canonical_key NULL — resolve substance identity from algo-derm
    $COMPOSE exec -w /app/backend api bun run src/db/seed/maintenance/backfill-canonical-key.ts --write
    printf "{{GREEN}}✓ CORE seed deltas pushed ($TARGET) — log: .audit-out/db/seed.log{{NC}}\n"

# Update existing seed entries (name/description/content/category) without touching user-data.
[group('db')]
db-seed-update:
    #!/usr/bin/env bash
    set -euo pipefail
    source {{justfile_directory()}}/scripts/just/_lib.sh
    TARGET="${TARGET:-dev}"
    target_compose
    LOG="{{justfile_directory()}}/.audit-out/db/seed.log"
    mkdir -p "$(dirname "$LOG")"
    printf "{{CYAN}}Updating existing CORE seed entries ($TARGET)...{{NC}}\n"
    $COMPOSE exec -w /app/backend api bun run src/db/seed/seeders/seed-core.ts --update 2>&1 | tee "$LOG"
    printf "{{GREEN}}✓ CORE seed updated ($TARGET) — log: .audit-out/db/seed.log{{NC}}\n"

# Alias — idempotent mode is default since Phase 5d
[group('db')]
db-seed-merge: db-seed

# Seed + audit (recommended after reseed). Composite, inherits TARGET.
[group('db')]
db-seed-safe: db-seed audit-db

# Backup + idempotent delta push + audit. Composite, inherits TARGET.
[group('db')]
db-seed-merge-safe: db-backup db-seed-merge audit-db

# Fix tag-domain then persist dev snapshot in one command. WRITE=1 applies (else dry no-op). Dev-only.
[group('catalog')]
catalog-fix-tag-domain-safe: catalog-fix-tag-domain db-snapshot

# ─── Destructive (DOUBLE confirmation on prod) ──────────────────────────────

# ⚠️ Destructive seed (TRUNCATE + reseed). Triple confirmation on prod.
[group('db')]
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
    $COMPOSE exec -w /app/backend api bun run src/db/seed/seeders/seed-core.ts --reset
    printf "{{GREEN}}✓ CORE seed (--reset) done ($TARGET){{NC}}\n"

# Wipe DB completely (public schema). Destructive.
[group('db')]
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
[group('db')]
db-reset: db-clean db-migrate db-seed

# ─── Backup / restore ───────────────────────────────────────────────────────

# Create SQL backup. Prod = gzip + GPG (recipient backup@aurore.local). Dev = .sql brut.
[group('db')]
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
[group('db')]
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
[group('db')]
db-backup-prod:
    @TARGET=prod just db-backup

# [PROD] Delete backups older than 7 days (.sql.gz.gpg + .sql.gz pour la fenêtre de transition).
[group('db')]
db-backup-clean:
    find ./backups \( -name "*.sql.gz.gpg" -o -name "*.sql.gz" \) -mtime +7 -delete
    @printf "{{GREEN}}✓ Old backups deleted{{NC}}\n"

# [PROD] Install daily cron (3am) for backups
[group('db')]
backup-cron-install:
    #!/usr/bin/env bash
    printf "{{YELLOW}}Installing backup cron at /etc/cron.d/aurore-backup{{NC}}\n"
    echo "0 3 * * * root cd $(pwd) && just db-backup-prod && just db-backup-clean >> /var/log/aurore-backup.log 2>&1" \
        | sudo tee /etc/cron.d/aurore-backup > /dev/null
    sudo chmod 644 /etc/cron.d/aurore-backup
    printf "{{GREEN}}✓ Cron installed — daily backup at 3am{{NC}}\n"

# ─── Snapshot (dev-only — committable file, dev source of truth) ────────────

# Dump data → backend/src/db/snapshot/data.sql (committable, dev source of truth)
[group('db')]
db-snapshot:
    #!/usr/bin/env bash
    mkdir -p backend/src/db/snapshot
    {{COMPOSE_DEV}} exec -T db pg_dump -U app -d appdb \
        --data-only --inserts --no-owner --no-privileges \
        --exclude-schema=drizzle \
        > {{SNAPSHOT_FILE}}
    printf "{{GREEN}}✓ Snapshot written: {{SNAPSHOT_FILE}} ($(wc -l < {{SNAPSHOT_FILE}}) lines, $(du -h {{SNAPSHOT_FILE}} | cut -f1)){{NC}}\n"

# Reload snapshot/data.sql into DB — requires migrated schema. Dev-only.
[group('db')]
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
[group('db')]
db-snapshot-reset: db-clean db-migrate
    {{COMPOSE_DEV}} exec -T db psql -U app -d appdb -v ON_ERROR_STOP=1 < {{SNAPSHOT_FILE}} > /dev/null
    @printf "{{GREEN}}✓ DB reset from snapshot{{NC}}\n"

# Catalogue-only snapshot for prod seeding (no users/reviews/runtime). Owner FK
# rewritten to __OWNER_ID__. Dev-only (reads dev DB); run after a reconcile.
[group('db')]
db-catalogue-snapshot:
    #!/usr/bin/env bash
    set -euo pipefail
    mkdir -p backend/src/db/snapshot
    OWNER=$({{COMPOSE_DEV}} exec -T db psql -U app -d appdb -tAc \
        "SELECT created_by FROM products GROUP BY created_by ORDER BY count(*) DESC LIMIT 1")
    [ -n "$OWNER" ] || { printf "{{RED}}❌ no catalogue owner found{{NC}}\n"; exit 1; }
    {{COMPOSE_DEV}} exec -T db pg_dump -U app -d appdb \
        --data-only --inserts --no-owner --no-privileges \
        -t public.products -t public.ingredients -t public.product_ingredients \
        -t public.product_tag_links -t public.ingredient_tag_links \
        -t public.product_tag_types -t public.ingredient_tag_types \
        -t public.ingredient_dermo_profiles -t public.articles \
        -t public.brand_certifications \
        | sed "s/$OWNER/__OWNER_ID__/g" > {{CATALOGUE_FILE}}
    LEAK=$(grep -c "@seed.local\|@seed.com" {{CATALOGUE_FILE}} || true)
    printf "{{GREEN}}✓ Catalogue snapshot: {{CATALOGUE_FILE}} ($(wc -l < {{CATALOGUE_FILE}}) lines, $(du -h {{CATALOGUE_FILE}} | cut -f1)); seed-email lines: $LEAK{{NC}}\n"

# Create the prod catalogue owner from ADMIN_EMAIL/ADMIN_PASSWORD (idempotent).
[group('db')]
db-prod-admin:
    #!/usr/bin/env bash
    set -euo pipefail
    source {{justfile_directory()}}/scripts/just/_lib.sh
    TARGET="${TARGET:-dev}"
    target_compose
    $COMPOSE exec -w /app/backend api bun run src/db/seed/seeders/seed-prod-admin.ts

# Load catalogue.sql into a freshly-migrated DB, owned by the db-prod-admin user.
# Refuses if products already populated. Run db-prod-admin first.
[group('db')]
db-catalogue-load:
    #!/usr/bin/env bash
    set -euo pipefail
    source {{justfile_directory()}}/scripts/just/_lib.sh
    TARGET="${TARGET:-dev}"
    target_compose
    [ -f "{{CATALOGUE_FILE}}" ] || { printf "{{RED}}❌ No {{CATALOGUE_FILE}} — run just db-catalogue-snapshot{{NC}}\n"; exit 1; }
    OWNER_EMAIL=$($COMPOSE exec -T api printenv ADMIN_EMAIL || true)
    [ -n "$OWNER_EMAIL" ] || { printf "{{RED}}❌ ADMIN_EMAIL not set in env{{NC}}\n"; exit 1; }
    OWNER_ID=$($COMPOSE exec -T db psql -U app -d appdb -tAc "SELECT id FROM users WHERE email='$OWNER_EMAIL'")
    [ -n "$OWNER_ID" ] || { printf "{{RED}}❌ admin %s not found — run TARGET=%s just db-prod-admin first{{NC}}\n" "$OWNER_EMAIL" "$TARGET"; exit 1; }
    N=$($COMPOSE exec -T db psql -U app -d appdb -tAc "SELECT count(*) FROM products")
    [ "$N" = "0" ] || { printf "{{RED}}❌ products already has %s rows — refusing to clobber{{NC}}\n" "$N"; exit 1; }
    if [ "$TARGET" = "prod" ]; then
        printf "{{RED}}⚠ PROD CATALOGUE LOAD — tape 'PROD' pour confirmer{{NC}}\n"
        read -r -p "> " C
        [ "$C" = "PROD" ] || { printf "{{RED}}abandon{{NC}}\n"; exit 1; }
    fi
    # Dump owns the full catalogue: truncate every dump-written table safe from
    # user-data cascade (NOT products/ingredients — guard proves them empty, their
    # CASCADE wipes user rows) so a pre-seed/ingest write can't dup-abort the load.
    # public.-qualified: runs before the dump resets search_path to ''.
    { echo "TRUNCATE public.articles, public.brand_certifications, public.ingredient_dermo_profiles, public.ingredient_tag_types, public.ingredient_tag_links, public.product_ingredients, public.product_tag_types, public.product_tag_links CASCADE;"
      sed "s/__OWNER_ID__/$OWNER_ID/g" {{CATALOGUE_FILE}}
    } | $COMPOSE exec -T db psql -U app -d appdb -1 -v ON_ERROR_STOP=1 > /dev/null
    printf "{{GREEN}}✓ Catalogue loaded (%s), owner=%s{{NC}}\n" "$TARGET" "$OWNER_EMAIL"
