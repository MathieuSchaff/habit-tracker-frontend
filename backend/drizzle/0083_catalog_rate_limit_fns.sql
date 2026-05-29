-- HAND-WRITTEN MIGRATION — drizzle-kit cannot track function bodies.
--
-- Catalog submission rate-limit needs to count ALL of a user's rows, including
-- moderation_status='hidden' ones that the SELECT RLS policy hides from the
-- submitter. Counting under the user's own RLS context would miss hidden rows,
-- so an abuser whose spam was hidden would get their quota refunded (C-2).
--
-- SECURITY DEFINER + owned by `app` (BYPASSRLS) so the count sees every row
-- regardless of the caller's RLS context. EXECUTE is locked to app_runtime.
CREATE OR REPLACE FUNCTION count_recent_product_submissions(p_user uuid)
RETURNS TABLE(hr bigint, day bigint)
LANGUAGE sql
SECURITY DEFINER
STABLE
AS $$
  SELECT
    count(*) FILTER (WHERE created_at > now() - interval '1 hour'),
    count(*) FILTER (WHERE created_at > now() - interval '1 day')
  FROM products
  WHERE created_by = p_user
$$;--> statement-breakpoint
CREATE OR REPLACE FUNCTION count_recent_ingredient_submissions(p_user uuid)
RETURNS TABLE(hr bigint, day bigint)
LANGUAGE sql
SECURITY DEFINER
STABLE
AS $$
  SELECT
    count(*) FILTER (WHERE created_at > now() - interval '1 hour'),
    count(*) FILTER (WHERE created_at > now() - interval '1 day')
  FROM ingredients
  WHERE created_by = p_user
$$;--> statement-breakpoint
REVOKE EXECUTE ON FUNCTION count_recent_product_submissions(uuid) FROM PUBLIC;--> statement-breakpoint
REVOKE EXECUTE ON FUNCTION count_recent_ingredient_submissions(uuid) FROM PUBLIC;--> statement-breakpoint
GRANT EXECUTE ON FUNCTION count_recent_product_submissions(uuid) TO app_runtime;--> statement-breakpoint
GRANT EXECUTE ON FUNCTION count_recent_ingredient_submissions(uuid) TO app_runtime;
