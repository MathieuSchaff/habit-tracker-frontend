CREATE POLICY "profiles_select_for_post_reply" ON "profiles" AS PERMISSIVE FOR SELECT TO "app_runtime" USING (NOT "profiles"."forced_private_by_admin" AND EXISTS (
        SELECT 1 FROM social_post_replies spr
        WHERE spr.author_id = "profiles"."user_id" AND spr.moderation_status = 'visible'
      ));