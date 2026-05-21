CREATE TYPE "public"."moderation_status" AS ENUM('visible', 'hidden');--> statement-breakpoint
ALTER TABLE "discussion_replies" ADD COLUMN "moderation_status" "moderation_status" DEFAULT 'visible' NOT NULL;--> statement-breakpoint
ALTER TABLE "discussion_replies" ADD COLUMN "moderated_by" uuid;--> statement-breakpoint
ALTER TABLE "discussion_replies" ADD COLUMN "moderated_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "discussion_replies" ADD COLUMN "moderation_reason" text;--> statement-breakpoint
ALTER TABLE "discussion_threads" ADD COLUMN "moderation_status" "moderation_status" DEFAULT 'visible' NOT NULL;--> statement-breakpoint
ALTER TABLE "discussion_threads" ADD COLUMN "moderated_by" uuid;--> statement-breakpoint
ALTER TABLE "discussion_threads" ADD COLUMN "moderated_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "discussion_threads" ADD COLUMN "moderation_reason" text;--> statement-breakpoint
ALTER TABLE "user_product_reviews" ADD COLUMN "moderation_status" "moderation_status" DEFAULT 'visible' NOT NULL;--> statement-breakpoint
ALTER TABLE "user_product_reviews" ADD COLUMN "moderated_by" uuid;--> statement-breakpoint
ALTER TABLE "user_product_reviews" ADD COLUMN "moderated_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "user_product_reviews" ADD COLUMN "moderation_reason" text;--> statement-breakpoint
ALTER TABLE "discussion_replies" ADD CONSTRAINT "discussion_replies_moderated_by_users_id_fk" FOREIGN KEY ("moderated_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "discussion_threads" ADD CONSTRAINT "discussion_threads_moderated_by_users_id_fk" FOREIGN KEY ("moderated_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_product_reviews" ADD CONSTRAINT "user_product_reviews_moderated_by_users_id_fk" FOREIGN KEY ("moderated_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;