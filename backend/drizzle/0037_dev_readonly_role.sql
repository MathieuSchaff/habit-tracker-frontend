-- HAND-WRITTEN MIGRATION — drizzle-kit does NOT track roles or grants.
-- Carried forward only by `make db-migrate`. Never `make db-push`.
--
-- Investigation role for prod debugging. SELECT-only, NOLOGIN.
--
-- Catalog tables (products, ingredients, articles, …) read freely.
-- Tenant tables (FORCE RLS, policies TO app_runtime) return 0 rows under
-- dev_readonly because no policy matches it. To inspect a tenant's data,
-- switch role inside the same session:
--
--     SET ROLE app_runtime;
--     SET LOCAL app.user_id = '<uuid>';
--     SELECT * FROM tasks;
--
-- INSERT/UPDATE/DELETE are not granted, so a typo cannot destroy data.

CREATE ROLE dev_readonly NOLOGIN;

GRANT USAGE ON SCHEMA public TO dev_readonly;
GRANT USAGE ON SCHEMA auth TO dev_readonly;

GRANT SELECT ON ALL TABLES IN SCHEMA public TO dev_readonly;
GRANT SELECT ON ALL SEQUENCES IN SCHEMA public TO dev_readonly;

GRANT EXECUTE ON FUNCTION auth.uid() TO dev_readonly;
GRANT EXECUTE ON FUNCTION auth.role() TO dev_readonly;

-- Future tables/sequences created by the `app` owner inherit SELECT.
ALTER DEFAULT PRIVILEGES FOR ROLE app IN SCHEMA public
  GRANT SELECT ON TABLES TO dev_readonly;
ALTER DEFAULT PRIVILEGES FOR ROLE app IN SCHEMA public
  GRANT SELECT ON SEQUENCES TO dev_readonly;
