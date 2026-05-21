ALTER POLICY "profiles_select_for_public_review" ON "profiles" TO app_runtime USING (NOT "profiles"."forced_private_by_admin" AND EXISTS (
        SELECT 1 FROM user_product_reviews r
        JOIN user_products up ON up.id = r.user_product_id
        WHERE r.is_public = TRUE
          AND r.moderation_status = 'visible'
          AND up.user_id = "profiles"."user_id"
      ));--> statement-breakpoint
ALTER POLICY "user_dermo_profiles_select_public" ON "user_dermo_profiles" TO app_runtime USING (EXISTS (
        SELECT 1 FROM profiles p
        WHERE p.user_id = "user_dermo_profiles"."user_id"
          AND p.profile_public = TRUE
          AND p.forced_private_by_admin = FALSE
      ));