-- HAND-WRITTEN MIGRATION — adds a SELECT policy on user_products gated by a
-- SECURITY DEFINER function. Direct EXISTS would form a cycle with
-- `user_product_reviews_tenant_isolation` (which itself joins user_products via
-- fkTenantPolicies). Postgres rejects the cycle with `infinite recursion
-- detected in policy for relation`. Wrapping the check in a SECURITY DEFINER
-- function bypasses RLS inside the helper and hides the inner read from the
-- policy planner.
--
-- Why we need this: `profiles_select_for_public_review` and
-- `listPublicReviewsForProduct` both JOIN user_products. Without a public
-- SELECT policy on user_products, anon callers see zero user_product rows,
-- which silently empties the public reviews surface (#7) for anonymous users
-- in production. Service-level tests bypass RLS (owner pool) so this gap was
-- only caught by `tests/integration/public-reviews-rls.test.ts`.

CREATE OR REPLACE FUNCTION public.user_product_has_public_review(up_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
  SELECT EXISTS (
    SELECT 1 FROM user_product_reviews
    WHERE user_product_id = up_id AND is_public = TRUE
  );
$$;

REVOKE ALL ON FUNCTION public.user_product_has_public_review(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.user_product_has_public_review(uuid) TO app_runtime;

CREATE POLICY "user_products_select_for_public_review" ON "user_products"
  AS PERMISSIVE FOR SELECT TO "app_runtime"
  USING (public.user_product_has_public_review(id));
