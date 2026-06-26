CREATE POLICY "user_dermo_profiles_select_discoverable" ON "user_dermo_profiles" AS PERMISSIVE FOR SELECT TO "app_runtime" USING ("user_dermo_profiles"."discoverable" = TRUE AND EXISTS (
        SELECT 1 FROM profiles p
        WHERE p.user_id = "user_dermo_profiles"."user_id"
          AND p.profile_public = TRUE
          AND p.forced_private_by_admin = FALSE
      ));