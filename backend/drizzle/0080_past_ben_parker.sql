CREATE POLICY "user_dermo_profiles_select_for_public_review" ON "user_dermo_profiles" AS PERMISSIVE FOR SELECT TO "app_runtime" USING (("user_dermo_profiles"."skin_types_public" = TRUE OR "user_dermo_profiles"."fitzpatrick_public" = TRUE) AND EXISTS (
        SELECT 1 FROM profiles p
        JOIN user_products up ON up.user_id = p.user_id
        JOIN user_product_reviews r ON r.user_product_id = up.id
        WHERE p.user_id = "user_dermo_profiles"."user_id"
          AND NOT p.forced_private_by_admin
          AND r.is_public = TRUE
          AND r.moderation_status = 'visible'
      ));