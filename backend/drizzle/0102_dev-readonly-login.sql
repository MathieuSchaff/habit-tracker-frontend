-- Custom SQL migration file, put your code below! --

-- LOGIN: lets GUI clients (DBeaver) connect as dev_readonly directly.
-- BYPASSRLS: catalog tables are RLS-scoped to app_runtime (since 0037), so this
-- SELECT-only role reads 0 rows without bypass. Still cannot write or read hashes.
-- Password is set out-of-band per environment (secret, never committed).
ALTER ROLE dev_readonly LOGIN BYPASSRLS;