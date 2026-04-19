CREATE SCHEMA "auth";


-- auth.uid() answers: "which user is currently logged in?"
--
-- When a request hits the API, the middleware stores the user's ID
-- in a Postgres session variable called 'app.user_id'.
-- This function just reads that variable and converts it to a UUID.
-- The inner (SELECT ...) tells Postgres: "evaluate this once for the
-- whole query, not once per row" — faster on big tables.
CREATE  OR REPLACE  FUNCTION auth.uid()
 RETURNS uuid
 LANGUAGE sql
STABLE
LEAKPROOF
SECURITY INVOKER
PARALLEL SAFE
AS $$
    SELECT (SELECT current_setting('app.user_id', true)::uuid)
$$;

-- auth.role() answers: "what role does the current user have?"
--
-- Same idea, but reads 'app.role' instead (e.g. 'user' or 'admin').
-- Used by RLS policies that need to give admins extra access.
CREATE  OR REPLACE  FUNCTION auth.role()
 RETURNS text
 LANGUAGE sql
STABLE
LEAKPROOF
SECURITY INVOKER
PARALLEL SAFE
AS $$
    SELECT (SELECT current_setting('app.role', true))
$$;

-- Allow app_runtime to see and use everything inside the auth schema.
-- Without USAGE, Postgres refuses to resolve auth.uid() even if the function exists.
GRANT USAGE ON SCHEMA auth TO app_runtime;
-- Allow app_runtime to actually call the functions.
-- USAGE alone is not enough — you also need EXECUTE to run them.
GRANT EXECUTE ON FUNCTION auth.uid() TO app_runtime;
GRANT EXECUTE ON FUNCTION auth.role() TO app_runtime;
