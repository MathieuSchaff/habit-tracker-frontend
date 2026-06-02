CREATE TYPE "public"."role_request_status" AS ENUM('pending', 'approved', 'rejected', 'cancelled');--> statement-breakpoint
CREATE TABLE "role_requests" (
	"id" uuid PRIMARY KEY DEFAULT uuidv7() NOT NULL,
	"user_id" uuid NOT NULL,
	"motivation" text NOT NULL,
	"motivation_link" text,
	"status" "role_request_status" DEFAULT 'pending' NOT NULL,
	"rejection_reason" text,
	"reviewed_by" uuid,
	"reviewed_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "role_requests" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "role_requests" FORCE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "role_requests" ADD CONSTRAINT "role_requests_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "role_requests" ADD CONSTRAINT "role_requests_reviewed_by_users_id_fk" FOREIGN KEY ("reviewed_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "role_requests_user_idx" ON "role_requests" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "role_requests_status_idx" ON "role_requests" USING btree ("status");--> statement-breakpoint
CREATE UNIQUE INDEX "role_requests_user_pending_unique" ON "role_requests" USING btree ("user_id") WHERE "role_requests"."status" = 'pending';--> statement-breakpoint
CREATE POLICY "role_requests_tenant_isolation" ON "role_requests" AS PERMISSIVE FOR ALL TO "app_runtime" USING ("role_requests"."user_id" = (SELECT auth.uid())) WITH CHECK ("role_requests"."user_id" = (SELECT auth.uid()));--> statement-breakpoint
CREATE POLICY "role_requests_admin_bypass" ON "role_requests" AS PERMISSIVE FOR ALL TO "app_runtime" USING ((SELECT auth.role()) = 'admin') WITH CHECK ((SELECT auth.role()) = 'admin');