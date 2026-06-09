-- Reconciles the product_comparisons + _items policies into the schema. They were created as
-- raw SQL in 0033 (current_setting cast, missed by the 0035/0036 auth.uid() rollout) and never
-- tracked in the snapshot. Now declared in comparisons.ts and recreated from schema with the
-- NULLIF-safe auth.uid()/auth.role() wrappers. DROP IF EXISTS because 0033 already created them.
ALTER TABLE "product_comparison_items" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "product_comparisons" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
DROP POLICY IF EXISTS "product_comparison_items_tenant_isolation" ON "product_comparison_items";--> statement-breakpoint
CREATE POLICY "product_comparison_items_tenant_isolation" ON "product_comparison_items" AS PERMISSIVE FOR ALL TO "app_runtime" USING (EXISTS (
        SELECT 1 FROM "product_comparisons" c
        WHERE c.id = "product_comparison_items"."comparison_id"
          AND c.user_id = (SELECT auth.uid())
      )) WITH CHECK (EXISTS (
        SELECT 1 FROM "product_comparisons" c
        WHERE c.id = "product_comparison_items"."comparison_id"
          AND c.user_id = (SELECT auth.uid())
      ));--> statement-breakpoint
DROP POLICY IF EXISTS "product_comparison_items_admin_bypass" ON "product_comparison_items";--> statement-breakpoint
CREATE POLICY "product_comparison_items_admin_bypass" ON "product_comparison_items" AS PERMISSIVE FOR ALL TO "app_runtime" USING ((SELECT auth.role()) = 'admin') WITH CHECK ((SELECT auth.role()) = 'admin');--> statement-breakpoint
DROP POLICY IF EXISTS "product_comparisons_tenant_isolation" ON "product_comparisons";--> statement-breakpoint
CREATE POLICY "product_comparisons_tenant_isolation" ON "product_comparisons" AS PERMISSIVE FOR ALL TO "app_runtime" USING ("product_comparisons"."user_id" = (SELECT auth.uid())) WITH CHECK ("product_comparisons"."user_id" = (SELECT auth.uid()));--> statement-breakpoint
DROP POLICY IF EXISTS "product_comparisons_admin_bypass" ON "product_comparisons";--> statement-breakpoint
CREATE POLICY "product_comparisons_admin_bypass" ON "product_comparisons" AS PERMISSIVE FOR ALL TO "app_runtime" USING ((SELECT auth.role()) = 'admin') WITH CHECK ((SELECT auth.role()) = 'admin');
