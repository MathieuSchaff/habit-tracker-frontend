-- HAND-WRITTEN MIGRATION — drizzle-kit does NOT track FORCE RLS.
-- Drizzle's TS schema has no .forceRLS() helper, so `drizzle-kit push` would
-- silently leave tables un-FORCED if it ever ran against a fresh DB.
-- Keep `make db-migrate` (which replays this file) canonical. Never use
-- `make db-push`. To change FORCE state, write a new --custom migration.
ALTER TABLE "tasks" FORCE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "subtasks" FORCE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "habits" FORCE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "habit_products" FORCE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "habit_schedules" FORCE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "habit_timings" FORCE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "habit_reminders" FORCE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "habit_periods" FORCE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "habit_checks" FORCE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "habit_check_products" FORCE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "wellbeing_logs" FORCE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "user_products" FORCE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "user_product_reviews" FORCE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "purchases" FORCE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "user_ingredient_analysis_score" FORCE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "user_preferences" FORCE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "user_dermo_profiles" FORCE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "profiles" FORCE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "user_bans" FORCE ROW LEVEL SECURITY;
