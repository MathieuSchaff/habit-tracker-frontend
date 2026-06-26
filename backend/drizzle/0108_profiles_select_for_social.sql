CREATE POLICY "profiles_select_for_reaction" ON "profiles" AS PERMISSIVE FOR SELECT TO "app_runtime" USING (NOT "profiles"."forced_private_by_admin" AND EXISTS (
        SELECT 1 FROM social_reactions sr WHERE sr.user_id = "profiles"."user_id"
      ));--> statement-breakpoint
CREATE POLICY "profiles_select_for_social_post" ON "profiles" AS PERMISSIVE FOR SELECT TO "app_runtime" USING (NOT "profiles"."forced_private_by_admin" AND EXISTS (
        SELECT 1 FROM social_posts sp
        WHERE sp.author_id = "profiles"."user_id" AND sp.moderation_status = 'visible'
      ));