-- HAND-WRITTEN MIGRATION — drizzle-kit cannot track FORCE RLS or function
-- bodies. Carried forward only by `make db-migrate`. Never `make db-push`.
--
-- Pair migration to 0040: that one ENABLE'd RLS and created the two policies.
-- This one tightens to FORCE RLS (so app_runtime cannot bypass via owner role
-- shenanigans) and adds the SECURITY DEFINER function used by the refresh
-- flow, which has no `app.user_id` GUC bound yet (lookup happens before we
-- know whose token it is).

ALTER TABLE refresh_tokens FORCE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION auth.find_active_refresh_token(p_jti_hash text)
RETURNS refresh_tokens
LANGUAGE sql
SECURITY DEFINER
STABLE
AS $$
  SELECT * FROM refresh_tokens
  WHERE jti_hash = p_jti_hash
    AND revoked_at IS NULL
    AND expires_at > now()
  LIMIT 1
$$;

REVOKE EXECUTE ON FUNCTION auth.find_active_refresh_token(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION auth.find_active_refresh_token(text) TO app_runtime;
