ALTER POLICY "user_bans_tenant_isolation" ON "user_bans" TO app_runtime USING ("user_bans"."user_id" = (SELECT auth.uid())) WITH CHECK ("user_bans"."user_id" = (SELECT auth.uid()));--> statement-breakpoint
ALTER POLICY "user_bans_admin_bypass" ON "user_bans" TO app_runtime USING ((SELECT auth.role()) = 'admin') WITH CHECK ((SELECT auth.role()) = 'admin');--> statement-breakpoint
ALTER POLICY "user_preferences_tenant_isolation" ON "user_preferences" TO app_runtime USING ("user_preferences"."user_id" = (SELECT auth.uid())) WITH CHECK ("user_preferences"."user_id" = (SELECT auth.uid()));--> statement-breakpoint
ALTER POLICY "user_preferences_admin_bypass" ON "user_preferences" TO app_runtime USING ((SELECT auth.role()) = 'admin') WITH CHECK ((SELECT auth.role()) = 'admin');--> statement-breakpoint
ALTER POLICY "profiles_tenant_isolation" ON "profiles" TO app_runtime USING ("profiles"."user_id" = (SELECT auth.uid())) WITH CHECK ("profiles"."user_id" = (SELECT auth.uid()));--> statement-breakpoint
ALTER POLICY "profiles_admin_bypass" ON "profiles" TO app_runtime USING ((SELECT auth.role()) = 'admin') WITH CHECK ((SELECT auth.role()) = 'admin');--> statement-breakpoint
ALTER POLICY "user_dermo_profiles_tenant_isolation" ON "user_dermo_profiles" TO app_runtime USING ("user_dermo_profiles"."user_id" = (SELECT auth.uid())) WITH CHECK ("user_dermo_profiles"."user_id" = (SELECT auth.uid()));--> statement-breakpoint
ALTER POLICY "user_dermo_profiles_admin_bypass" ON "user_dermo_profiles" TO app_runtime USING ((SELECT auth.role()) = 'admin') WITH CHECK ((SELECT auth.role()) = 'admin');--> statement-breakpoint
ALTER POLICY "user_ingredient_analysis_score_tenant_isolation" ON "user_ingredient_analysis_score" TO app_runtime USING ("user_ingredient_analysis_score"."user_id" = (SELECT auth.uid())) WITH CHECK ("user_ingredient_analysis_score"."user_id" = (SELECT auth.uid()));--> statement-breakpoint
ALTER POLICY "user_ingredient_analysis_score_admin_bypass" ON "user_ingredient_analysis_score" TO app_runtime USING ((SELECT auth.role()) = 'admin') WITH CHECK ((SELECT auth.role()) = 'admin');--> statement-breakpoint
ALTER POLICY "purchases_tenant_isolation" ON "purchases" TO app_runtime USING (EXISTS (
        SELECT 1 FROM "user_products" p
        WHERE p.id = "purchases"."user_product_id"
          AND p.user_id = (SELECT auth.uid())
      )) WITH CHECK (EXISTS (
        SELECT 1 FROM "user_products" p
        WHERE p.id = "purchases"."user_product_id"
          AND p.user_id = (SELECT auth.uid())
      ));--> statement-breakpoint
ALTER POLICY "purchases_admin_bypass" ON "purchases" TO app_runtime USING ((SELECT auth.role()) = 'admin') WITH CHECK ((SELECT auth.role()) = 'admin');--> statement-breakpoint
ALTER POLICY "user_product_reviews_tenant_isolation" ON "user_product_reviews" TO app_runtime USING (EXISTS (
        SELECT 1 FROM "user_products" p
        WHERE p.id = "user_product_reviews"."user_product_id"
          AND p.user_id = (SELECT auth.uid())
      )) WITH CHECK (EXISTS (
        SELECT 1 FROM "user_products" p
        WHERE p.id = "user_product_reviews"."user_product_id"
          AND p.user_id = (SELECT auth.uid())
      ));--> statement-breakpoint
ALTER POLICY "user_product_reviews_admin_bypass" ON "user_product_reviews" TO app_runtime USING ((SELECT auth.role()) = 'admin') WITH CHECK ((SELECT auth.role()) = 'admin');--> statement-breakpoint
ALTER POLICY "user_products_tenant_isolation" ON "user_products" TO app_runtime USING ("user_products"."user_id" = (SELECT auth.uid())) WITH CHECK ("user_products"."user_id" = (SELECT auth.uid()));--> statement-breakpoint
ALTER POLICY "user_products_admin_bypass" ON "user_products" TO app_runtime USING ((SELECT auth.role()) = 'admin') WITH CHECK ((SELECT auth.role()) = 'admin');