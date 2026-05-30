ALTER TYPE "public"."report_target_type" ADD VALUE 'product';--> statement-breakpoint
ALTER TYPE "public"."report_target_type" ADD VALUE 'ingredient';--> statement-breakpoint
ALTER POLICY "ingredients_select_visible" ON "ingredients" TO app_runtime USING (moderation_status = 'visible' OR (SELECT auth.role()) IN ('admin', 'contributor'));--> statement-breakpoint
ALTER POLICY "products_select_visible" ON "products" TO app_runtime USING (moderation_status = 'visible' OR (SELECT auth.role()) IN ('admin', 'contributor'));