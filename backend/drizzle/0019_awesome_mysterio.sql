DROP INDEX "habit_checks_unique";--> statement-breakpoint
CREATE UNIQUE INDEX "habit_checks_unique_with_timing" ON "habit_checks" USING btree ("habit_id","scheduled_date","timing_id") WHERE timing_id IS NOT NULL;--> statement-breakpoint
CREATE UNIQUE INDEX "habit_checks_unique_no_timing" ON "habit_checks" USING btree ("habit_id","scheduled_date") WHERE timing_id IS NULL;