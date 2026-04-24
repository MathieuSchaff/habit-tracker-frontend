DROP POLICY IF EXISTS "habit_checks_tenant_isolation" ON "habit_checks" CASCADE;--> statement-breakpoint
DROP POLICY IF EXISTS "habit_checks_admin_bypass" ON "habit_checks" CASCADE;--> statement-breakpoint
DROP TABLE "habit_checks" CASCADE;--> statement-breakpoint
DROP POLICY IF EXISTS "habit_periods_tenant_isolation" ON "habit_periods" CASCADE;--> statement-breakpoint
DROP POLICY IF EXISTS "habit_periods_admin_bypass" ON "habit_periods" CASCADE;--> statement-breakpoint
DROP TABLE "habit_periods" CASCADE;--> statement-breakpoint
DROP POLICY IF EXISTS "habit_products_tenant_isolation" ON "habit_products" CASCADE;--> statement-breakpoint
DROP POLICY IF EXISTS "habit_products_admin_bypass" ON "habit_products" CASCADE;--> statement-breakpoint
DROP TABLE "habit_products" CASCADE;--> statement-breakpoint
DROP POLICY IF EXISTS "habit_reminders_tenant_isolation" ON "habit_reminders" CASCADE;--> statement-breakpoint
DROP POLICY IF EXISTS "habit_reminders_admin_bypass" ON "habit_reminders" CASCADE;--> statement-breakpoint
DROP TABLE "habit_reminders" CASCADE;--> statement-breakpoint
DROP POLICY IF EXISTS "habit_schedules_tenant_isolation" ON "habit_schedules" CASCADE;--> statement-breakpoint
DROP POLICY IF EXISTS "habit_schedules_admin_bypass" ON "habit_schedules" CASCADE;--> statement-breakpoint
DROP TABLE "habit_schedules" CASCADE;--> statement-breakpoint
DROP POLICY IF EXISTS "habit_timings_tenant_isolation" ON "habit_timings" CASCADE;--> statement-breakpoint
DROP POLICY IF EXISTS "habit_timings_admin_bypass" ON "habit_timings" CASCADE;--> statement-breakpoint
DROP TABLE "habit_timings" CASCADE;--> statement-breakpoint
DROP POLICY IF EXISTS "habits_tenant_isolation" ON "habits" CASCADE;--> statement-breakpoint
DROP POLICY IF EXISTS "habits_admin_bypass" ON "habits" CASCADE;--> statement-breakpoint
DROP TABLE "habits" CASCADE;--> statement-breakpoint
DROP POLICY IF EXISTS "habit_check_products_tenant_isolation" ON "habit_check_products" CASCADE;--> statement-breakpoint
DROP POLICY IF EXISTS "habit_check_products_admin_bypass" ON "habit_check_products" CASCADE;--> statement-breakpoint
DROP TABLE "habit_check_products" CASCADE;--> statement-breakpoint
DROP POLICY IF EXISTS "wellbeing_logs_tenant_isolation" ON "wellbeing_logs" CASCADE;--> statement-breakpoint
DROP POLICY IF EXISTS "wellbeing_logs_admin_bypass" ON "wellbeing_logs" CASCADE;--> statement-breakpoint
DROP TABLE "wellbeing_logs" CASCADE;--> statement-breakpoint
DROP POLICY IF EXISTS "profiles_select_public" ON "profiles" CASCADE;--> statement-breakpoint
ALTER POLICY "profiles_tenant_isolation" ON "profiles" TO app_runtime USING ("profiles"."user_id" = (SELECT current_setting('app.user_id', true)::uuid)) WITH CHECK ("profiles"."user_id" = (SELECT current_setting('app.user_id', true)::uuid));--> statement-breakpoint
DROP TYPE "public"."habit_check_status";--> statement-breakpoint
DROP TYPE "public"."habit_frequency";--> statement-breakpoint
DROP TYPE "public"."wellbeing_metric";
