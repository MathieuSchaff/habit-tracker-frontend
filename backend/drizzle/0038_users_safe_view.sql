-- HAND-WRITTEN MIGRATION — drizzle-kit cannot track REVOKE/GRANT or
-- column-level privileges. Carried forward only by `make db-migrate`.
-- Never `make db-push`.
--
-- Hide password_hash + google_sub from app_runtime to prevent SELECT *
-- accidents (RETURNING *, JOIN *, log dumps). Auth flows that legitimately
-- need these columns go through SECURITY DEFINER functions (see 0039).
--
-- Postgres pitfall: column-level REVOKE only acts on column-level GRANT.
-- A table-level GRANT (which is what's currently on `users`) is unaffected
-- by column REVOKE. We must REVOKE the table-level grant in full, then
-- re-GRANT only the safe columns.
--
-- Effect on app_runtime after this migration:
--   SELECT * FROM users           -> permission denied (password_hash not granted)
--   SELECT id, email FROM users   -> ok (listed cols all granted)
--   INSERT users RETURNING *      -> permission denied
--   INSERT users RETURNING id,..  -> ok
--   SELECT * FROM users_safe      -> ok (view excludes the two cols)

CREATE VIEW users_safe AS
SELECT id, email, role, created_at, updated_at, email_verified_at,
       deleted_at, is_demo, expires_at
FROM users;

GRANT SELECT ON users_safe TO app_runtime;
GRANT SELECT ON users_safe TO dev_readonly;

-- Replace table-level SELECT with column-listed SELECT (excluding sensitive cols).
REVOKE SELECT ON users FROM app_runtime;
GRANT SELECT (
  id, email, role, created_at, updated_at, email_verified_at,
  deleted_at, is_demo, expires_at
) ON users TO app_runtime;

-- Same for dev_readonly so investigation can't dump hashes by accident.
REVOKE SELECT ON users FROM dev_readonly;
GRANT SELECT (
  id, email, role, created_at, updated_at, email_verified_at,
  deleted_at, is_demo, expires_at
) ON users TO dev_readonly;
