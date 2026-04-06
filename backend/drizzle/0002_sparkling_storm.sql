CREATE TYPE "public"."error_source" AS ENUM('backend', 'frontend');--> statement-breakpoint
CREATE TABLE "error_groups" (
	"id" uuid PRIMARY KEY DEFAULT uuidv7() NOT NULL,
	"fingerprint" text NOT NULL,
	"source" "error_source" NOT NULL,
	"message" text NOT NULL,
	"stack" text,
	"context" jsonb,
	"count" integer DEFAULT 1 NOT NULL,
	"first_seen_at" timestamp with time zone DEFAULT now() NOT NULL,
	"last_seen_at" timestamp with time zone DEFAULT now() NOT NULL,
	"resolved_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "error_occurrences" (
	"id" uuid PRIMARY KEY DEFAULT uuidv7() NOT NULL,
	"group_id" uuid NOT NULL,
	"user_id" uuid,
	"occurred_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "error_occurrences" ADD CONSTRAINT "error_occurrences_group_id_error_groups_id_fk" FOREIGN KEY ("group_id") REFERENCES "public"."error_groups"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "error_occurrences" ADD CONSTRAINT "error_occurrences_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "error_groups_fingerprint_idx" ON "error_groups" USING btree ("fingerprint");--> statement-breakpoint
CREATE INDEX "error_groups_resolved_last_seen_idx" ON "error_groups" USING btree ("resolved_at","last_seen_at");--> statement-breakpoint
CREATE INDEX "error_groups_source_idx" ON "error_groups" USING btree ("source");--> statement-breakpoint
CREATE INDEX "error_occurrences_group_idx" ON "error_occurrences" USING btree ("group_id");--> statement-breakpoint
CREATE INDEX "error_occurrences_user_idx" ON "error_occurrences" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "error_occurrences_group_occurred_idx" ON "error_occurrences" USING btree ("group_id","occurred_at");