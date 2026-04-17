ALTER TABLE "habit_periods" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "habit_products" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "habit_reminders" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "habit_schedules" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "habit_timings" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "habit_check_products" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "purchases" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "user_product_reviews" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "subtasks" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE POLICY "habit_periods_tenant_isolation" ON "habit_periods" AS PERMISSIVE FOR ALL TO "app_runtime" USING (EXISTS (
        SELECT 1 FROM "habits" p
        WHERE p.id = "habit_periods"."habit_id"
          AND p.user_id = (SELECT current_setting('app.user_id', true)::uuid)
      )) WITH CHECK (EXISTS (
        SELECT 1 FROM "habits" p
        WHERE p.id = "habit_periods"."habit_id"
          AND p.user_id = (SELECT current_setting('app.user_id', true)::uuid)
      ));--> statement-breakpoint
CREATE POLICY "habit_products_tenant_isolation" ON "habit_products" AS PERMISSIVE FOR ALL TO "app_runtime" USING (EXISTS (
        SELECT 1 FROM "habits" p
        WHERE p.id = "habit_products"."habit_id"
          AND p.user_id = (SELECT current_setting('app.user_id', true)::uuid)
      )) WITH CHECK (EXISTS (
        SELECT 1 FROM "habits" p
        WHERE p.id = "habit_products"."habit_id"
          AND p.user_id = (SELECT current_setting('app.user_id', true)::uuid)
      ));--> statement-breakpoint
CREATE POLICY "habit_reminders_tenant_isolation" ON "habit_reminders" AS PERMISSIVE FOR ALL TO "app_runtime" USING (EXISTS (
        SELECT 1
        FROM "habit_timings" ht
        JOIN "habit_schedules" hs ON hs.id = ht.schedule_id
        JOIN "habits" h ON h.id = hs.habit_id
        WHERE ht.id = "habit_reminders"."timing_id"
          AND h.user_id = (SELECT current_setting('app.user_id', true)::uuid)
      )) WITH CHECK (EXISTS (
        SELECT 1
        FROM "habit_timings" ht
        JOIN "habit_schedules" hs ON hs.id = ht.schedule_id
        JOIN "habits" h ON h.id = hs.habit_id
        WHERE ht.id = "habit_reminders"."timing_id"
          AND h.user_id = (SELECT current_setting('app.user_id', true)::uuid)
      ));--> statement-breakpoint
CREATE POLICY "habit_schedules_tenant_isolation" ON "habit_schedules" AS PERMISSIVE FOR ALL TO "app_runtime" USING (EXISTS (
        SELECT 1 FROM "habits" p
        WHERE p.id = "habit_schedules"."habit_id"
          AND p.user_id = (SELECT current_setting('app.user_id', true)::uuid)
      )) WITH CHECK (EXISTS (
        SELECT 1 FROM "habits" p
        WHERE p.id = "habit_schedules"."habit_id"
          AND p.user_id = (SELECT current_setting('app.user_id', true)::uuid)
      ));--> statement-breakpoint
CREATE POLICY "habit_timings_tenant_isolation" ON "habit_timings" AS PERMISSIVE FOR ALL TO "app_runtime" USING (EXISTS (
        SELECT 1
        FROM "habit_schedules" s
        JOIN "habits" h ON h.id = s.habit_id
        WHERE s.id = "habit_timings"."schedule_id"
          AND h.user_id = (SELECT current_setting('app.user_id', true)::uuid)
      )) WITH CHECK (EXISTS (
        SELECT 1
        FROM "habit_schedules" s
        JOIN "habits" h ON h.id = s.habit_id
        WHERE s.id = "habit_timings"."schedule_id"
          AND h.user_id = (SELECT current_setting('app.user_id', true)::uuid)
      ));--> statement-breakpoint
CREATE POLICY "habit_check_products_tenant_isolation" ON "habit_check_products" AS PERMISSIVE FOR ALL TO "app_runtime" USING (EXISTS (
        SELECT 1 FROM "habit_checks" p
        WHERE p.id = "habit_check_products"."check_id"
          AND p.user_id = (SELECT current_setting('app.user_id', true)::uuid)
      )) WITH CHECK (EXISTS (
        SELECT 1 FROM "habit_checks" p
        WHERE p.id = "habit_check_products"."check_id"
          AND p.user_id = (SELECT current_setting('app.user_id', true)::uuid)
      ));--> statement-breakpoint
CREATE POLICY "purchases_tenant_isolation" ON "purchases" AS PERMISSIVE FOR ALL TO "app_runtime" USING (EXISTS (
        SELECT 1 FROM "user_products" p
        WHERE p.id = "purchases"."user_product_id"
          AND p.user_id = (SELECT current_setting('app.user_id', true)::uuid)
      )) WITH CHECK (EXISTS (
        SELECT 1 FROM "user_products" p
        WHERE p.id = "purchases"."user_product_id"
          AND p.user_id = (SELECT current_setting('app.user_id', true)::uuid)
      ));--> statement-breakpoint
CREATE POLICY "user_product_reviews_tenant_isolation" ON "user_product_reviews" AS PERMISSIVE FOR ALL TO "app_runtime" USING (EXISTS (
        SELECT 1 FROM "user_products" p
        WHERE p.id = "user_product_reviews"."user_product_id"
          AND p.user_id = (SELECT current_setting('app.user_id', true)::uuid)
      )) WITH CHECK (EXISTS (
        SELECT 1 FROM "user_products" p
        WHERE p.id = "user_product_reviews"."user_product_id"
          AND p.user_id = (SELECT current_setting('app.user_id', true)::uuid)
      ));--> statement-breakpoint
CREATE POLICY "subtasks_tenant_isolation" ON "subtasks" AS PERMISSIVE FOR ALL TO "app_runtime" USING (EXISTS (
        SELECT 1 FROM "tasks" p
        WHERE p.id = "subtasks"."task_id"
          AND p.user_id = (SELECT current_setting('app.user_id', true)::uuid)
      )) WITH CHECK (EXISTS (
        SELECT 1 FROM "tasks" p
        WHERE p.id = "subtasks"."task_id"
          AND p.user_id = (SELECT current_setting('app.user_id', true)::uuid)
      ));