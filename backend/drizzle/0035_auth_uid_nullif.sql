-- HAND-WRITTEN MIGRATION — drizzle-kit does NOT track SQL function bodies.
-- This file is only carried forward by `make db-migrate`. Never `make db-push`.
--
-- Make auth.uid() safe when 'app.user_id' is unset (empty string).
--
-- Some policies (e.g. profiles_select_public) are evaluated on requests
-- that run *without* bindRlsContext (public profile lookup). The previous
-- body cast '' directly to uuid → throws "invalid input syntax for type uuid"
-- and crashes the request. NULLIF turns '' into NULL, the cast yields NULL,
-- the equality is unknown, and the policy simply doesn't match (safe fail).
CREATE OR REPLACE FUNCTION auth.uid()
 RETURNS uuid
 LANGUAGE sql
STABLE
LEAKPROOF
SECURITY INVOKER
PARALLEL SAFE
AS $$
    SELECT (SELECT NULLIF(current_setting('app.user_id', true), '')::uuid)
$$;
