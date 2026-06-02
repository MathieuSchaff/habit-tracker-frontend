-- Fail-closed DB backstop: the application pool (app_runtime) may never set a user's
-- role to 'admin'. Admin is bootstrap-only — seed, migrations and manual SQL run as the
-- table owner, which this trigger ignores. Demote->'user' and promote->'contributor'
-- (role-request flow 16b) stay allowed. Guards against a relaxed validator on the
-- role-write path silently granting admin.
CREATE OR REPLACE FUNCTION forbid_app_runtime_admin_promotion()
  RETURNS trigger
  LANGUAGE plpgsql
AS $$
BEGIN
  IF current_user = 'app_runtime'
     AND NEW.role IS DISTINCT FROM OLD.role
     AND NEW.role = 'admin' THEN
    RAISE EXCEPTION 'admin promotion not allowed for app_runtime';
  END IF;
  RETURN NEW;
END;
$$;--> statement-breakpoint
CREATE TRIGGER users_forbid_admin_promotion
  BEFORE INSERT OR UPDATE ON users
  FOR EACH ROW
  EXECUTE FUNCTION forbid_app_runtime_admin_promotion();
