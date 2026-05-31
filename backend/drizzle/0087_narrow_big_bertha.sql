ALTER TABLE "content_reports" ADD COLUMN "escalated_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "content_reports" ADD COLUMN "escalated_by" uuid;--> statement-breakpoint
ALTER TABLE "content_reports" ADD CONSTRAINT "content_reports_escalated_by_users_id_fk" FOREIGN KEY ("escalated_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "content_reports_escalated_idx" ON "content_reports" USING btree ("escalated_at") WHERE escalated_at IS NOT NULL;--> statement-breakpoint
CREATE POLICY "content_reports_moderation_select" ON "content_reports" AS PERMISSIVE FOR SELECT TO "app_runtime" USING ((SELECT auth.role()) IN ('admin', 'contributor'));--> statement-breakpoint
CREATE POLICY "content_reports_moderation_update" ON "content_reports" AS PERMISSIVE FOR UPDATE TO "app_runtime" USING ((SELECT auth.role()) IN ('admin', 'contributor')) WITH CHECK ((SELECT auth.role()) IN ('admin', 'contributor'));