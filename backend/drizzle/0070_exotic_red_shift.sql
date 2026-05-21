ALTER TABLE "profiles" ADD COLUMN "forced_private_by_admin" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "profiles" ADD COLUMN "forced_private_by" uuid;--> statement-breakpoint
ALTER TABLE "profiles" ADD COLUMN "forced_private_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "profiles" ADD COLUMN "forced_private_reason" text;--> statement-breakpoint
ALTER TABLE "profiles" ADD CONSTRAINT "profiles_forced_private_by_users_id_fk" FOREIGN KEY ("forced_private_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER POLICY "profiles_select_public" ON "profiles" TO app_runtime USING ("profiles"."profile_public" AND NOT "profiles"."forced_private_by_admin");--> statement-breakpoint
ALTER POLICY "profiles_select_for_public_review" ON "profiles" TO app_runtime USING (NOT "profiles"."forced_private_by_admin" AND EXISTS (
        SELECT 1 FROM user_product_reviews r
        JOIN user_products up ON up.id = r.user_product_id
        WHERE r.is_public = TRUE AND up.user_id = "profiles"."user_id"
      ));