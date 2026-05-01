-- HAND-WRITTEN MIGRATION — drizzle-kit cannot track function bodies.
-- Carried forward only by `make db-migrate`. Never `make db-push`.
--
-- SECURITY DEFINER functions are the *only* path for app_runtime to read
-- password_hash and google_sub (column-level REVOKE in 0038).
-- Functions are owned by `app` (BYPASSRLS), so they see all rows
-- regardless of RLS context — required for login (no JWT yet) and Google OAuth.
--
-- Behavior matches the previous direct SELECTs exactly (same WHERE, no
-- deleted_at filter — keep that decision in the application layer).

CREATE OR REPLACE FUNCTION auth.find_user_with_hash_by_email(p_email text)
RETURNS users
LANGUAGE sql
SECURITY DEFINER
STABLE
AS $$
  SELECT * FROM users WHERE email = p_email LIMIT 1
$$;

CREATE OR REPLACE FUNCTION auth.find_user_with_hash_by_id(p_id uuid)
RETURNS users
LANGUAGE sql
SECURITY DEFINER
STABLE
AS $$
  SELECT * FROM users WHERE id = p_id LIMIT 1
$$;

CREATE OR REPLACE FUNCTION auth.find_user_by_google_sub(p_sub text)
RETURNS users
LANGUAGE sql
SECURITY DEFINER
STABLE
AS $$
  SELECT * FROM users WHERE google_sub = p_sub LIMIT 1
$$;

REVOKE EXECUTE ON FUNCTION auth.find_user_with_hash_by_email(text) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION auth.find_user_with_hash_by_id(uuid) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION auth.find_user_by_google_sub(text) FROM PUBLIC;

GRANT EXECUTE ON FUNCTION auth.find_user_with_hash_by_email(text) TO app_runtime;
GRANT EXECUTE ON FUNCTION auth.find_user_with_hash_by_id(uuid) TO app_runtime;
GRANT EXECUTE ON FUNCTION auth.find_user_by_google_sub(text) TO app_runtime;
