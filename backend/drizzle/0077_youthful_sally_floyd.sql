ALTER TABLE "ingredients" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "product_ingredients" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "products" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "ingredient_tags" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "product_tags" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "tag_ingredients" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "tag_products" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE POLICY "ingredients_select_public" ON "ingredients" AS PERMISSIVE FOR SELECT TO "app_runtime" USING (true);--> statement-breakpoint
CREATE POLICY "ingredients_write_role" ON "ingredients" AS PERMISSIVE FOR ALL TO "app_runtime" USING ((SELECT auth.role()) IN ('admin', 'contributor')) WITH CHECK ((SELECT auth.role()) IN ('admin', 'contributor'));--> statement-breakpoint
CREATE POLICY "product_ingredients_select_public" ON "product_ingredients" AS PERMISSIVE FOR SELECT TO "app_runtime" USING (true);--> statement-breakpoint
CREATE POLICY "product_ingredients_write_role" ON "product_ingredients" AS PERMISSIVE FOR ALL TO "app_runtime" USING ((SELECT auth.role()) IN ('admin', 'contributor')) WITH CHECK ((SELECT auth.role()) IN ('admin', 'contributor'));--> statement-breakpoint
CREATE POLICY "products_select_public" ON "products" AS PERMISSIVE FOR SELECT TO "app_runtime" USING (true);--> statement-breakpoint
CREATE POLICY "products_write_role" ON "products" AS PERMISSIVE FOR ALL TO "app_runtime" USING ((SELECT auth.role()) IN ('admin', 'contributor')) WITH CHECK ((SELECT auth.role()) IN ('admin', 'contributor'));--> statement-breakpoint
CREATE POLICY "ingredient_tags_select_public" ON "ingredient_tags" AS PERMISSIVE FOR SELECT TO "app_runtime" USING (true);--> statement-breakpoint
CREATE POLICY "ingredient_tags_write_role" ON "ingredient_tags" AS PERMISSIVE FOR ALL TO "app_runtime" USING ((SELECT auth.role()) = 'admin') WITH CHECK ((SELECT auth.role()) = 'admin');--> statement-breakpoint
CREATE POLICY "product_tags_select_public" ON "product_tags" AS PERMISSIVE FOR SELECT TO "app_runtime" USING (true);--> statement-breakpoint
CREATE POLICY "product_tags_write_role" ON "product_tags" AS PERMISSIVE FOR ALL TO "app_runtime" USING ((SELECT auth.role()) = 'admin') WITH CHECK ((SELECT auth.role()) = 'admin');--> statement-breakpoint
CREATE POLICY "tag_ingredients_select_public" ON "tag_ingredients" AS PERMISSIVE FOR SELECT TO "app_runtime" USING (true);--> statement-breakpoint
CREATE POLICY "tag_ingredients_write_role" ON "tag_ingredients" AS PERMISSIVE FOR ALL TO "app_runtime" USING ((SELECT auth.role()) = 'admin') WITH CHECK ((SELECT auth.role()) = 'admin');--> statement-breakpoint
CREATE POLICY "tag_products_select_public" ON "tag_products" AS PERMISSIVE FOR SELECT TO "app_runtime" USING (true);--> statement-breakpoint
CREATE POLICY "tag_products_write_role" ON "tag_products" AS PERMISSIVE FOR ALL TO "app_runtime" USING ((SELECT auth.role()) IN ('admin', 'contributor')) WITH CHECK ((SELECT auth.role()) IN ('admin', 'contributor'));