CREATE TYPE "public"."edit_target_type" AS ENUM('product', 'ingredient');--> statement-breakpoint
CREATE TYPE "public"."suggested_edit_status" AS ENUM('pending', 'accepted', 'rejected');--> statement-breakpoint
CREATE TABLE "suggested_edits" (
	"id" uuid PRIMARY KEY DEFAULT uuidv7() NOT NULL,
	"proposer_id" uuid NOT NULL,
	"target_type" "edit_target_type" NOT NULL,
	"target_id" uuid NOT NULL,
	"field" text NOT NULL,
	"proposed_value" text NOT NULL,
	"status" "suggested_edit_status" DEFAULT 'pending' NOT NULL,
	"reviewed_by" uuid,
	"reviewed_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "suggested_edits" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "suggested_edits" FORCE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "suggested_edits" ADD CONSTRAINT "suggested_edits_proposer_id_users_id_fk" FOREIGN KEY ("proposer_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "suggested_edits" ADD CONSTRAINT "suggested_edits_reviewed_by_users_id_fk" FOREIGN KEY ("reviewed_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "suggested_edits_status_idx" ON "suggested_edits" USING btree ("status");--> statement-breakpoint
CREATE INDEX "suggested_edits_proposer_idx" ON "suggested_edits" USING btree ("proposer_id");--> statement-breakpoint
CREATE INDEX "suggested_edits_target_idx" ON "suggested_edits" USING btree ("target_type","target_id");--> statement-breakpoint
CREATE POLICY "suggested_edits_tenant_isolation" ON "suggested_edits" AS PERMISSIVE FOR ALL TO "app_runtime" USING ("suggested_edits"."proposer_id" = (SELECT auth.uid())) WITH CHECK ("suggested_edits"."proposer_id" = (SELECT auth.uid()));--> statement-breakpoint
CREATE POLICY "suggested_edits_admin_bypass" ON "suggested_edits" AS PERMISSIVE FOR ALL TO "app_runtime" USING ((SELECT auth.role()) = 'admin') WITH CHECK ((SELECT auth.role()) = 'admin');--> statement-breakpoint
CREATE POLICY "suggested_edits_moderation_select" ON "suggested_edits" AS PERMISSIVE FOR SELECT TO "app_runtime" USING ((SELECT auth.role()) IN ('admin', 'contributor'));--> statement-breakpoint
CREATE POLICY "suggested_edits_moderation_update" ON "suggested_edits" AS PERMISSIVE FOR UPDATE TO "app_runtime" USING ((SELECT auth.role()) IN ('admin', 'contributor')) WITH CHECK ((SELECT auth.role()) IN ('admin', 'contributor'));