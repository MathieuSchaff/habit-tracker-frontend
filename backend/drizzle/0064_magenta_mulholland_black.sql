ALTER TABLE "profiles" ADD COLUMN "bio_public" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "profiles" ADD COLUMN "avatar_public" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "profiles" ADD COLUMN "links_public" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "user_dermo_profiles" ADD COLUMN "skin_types_public" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "user_dermo_profiles" ADD COLUMN "fitzpatrick_public" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "user_dermo_profiles" ADD COLUMN "skin_concerns_public" boolean DEFAULT false NOT NULL;--> statement-breakpoint
CREATE POLICY "user_dermo_profiles_select_public" ON "user_dermo_profiles" AS PERMISSIVE FOR SELECT TO "app_runtime" USING (EXISTS (
        SELECT 1 FROM profiles p
        WHERE p.user_id = "user_dermo_profiles"."user_id" AND p.profile_public = TRUE
      ));