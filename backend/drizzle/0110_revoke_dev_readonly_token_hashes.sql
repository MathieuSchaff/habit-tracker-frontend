-- HAND-WRITTEN MIGRATION — drizzle-kit does NOT track roles or grants.
-- Carried forward only by `db-migrate`. Never `db-push`.
--
-- password_resets and email_verifications are pre-identity tables kept OUTSIDE RLS
-- (lookups happen before any session), so the blanket SELECT grant from 0037 plus the
-- BYPASSRLS added in 0102 let dev_readonly read their token_hash columns — contradicting
-- 0102's own "Still cannot write or read hashes" guarantee. A leaked active hash, paired
-- with a /forgot-password request, enables account takeover. Revoke read on both.

REVOKE SELECT ON password_resets FROM dev_readonly;
REVOKE SELECT ON email_verifications FROM dev_readonly;
