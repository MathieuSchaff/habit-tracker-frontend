CREATE POLICY "profiles_select_for_public_review" ON "profiles" AS PERMISSIVE FOR SELECT TO "app_runtime" USING (EXISTS (
        SELECT 1 FROM user_product_reviews r
        JOIN user_products up ON up.id = r.user_product_id
        WHERE r.is_public = TRUE AND up.user_id = "profiles"."user_id"
      ));