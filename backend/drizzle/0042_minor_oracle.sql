ALTER TABLE "user_dermo_profiles" ADD CONSTRAINT "user_dermo_profiles_fitzpatrick_range" CHECK ("user_dermo_profiles"."fitzpatrick_type" BETWEEN 1 AND 6);--> statement-breakpoint
ALTER TABLE "purchases" ADD CONSTRAINT "purchases_opened_after_purchased" CHECK ("purchases"."opened_at" IS NULL OR "purchases"."opened_at" >= "purchases"."purchased_at");--> statement-breakpoint
ALTER TABLE "purchases" ADD CONSTRAINT "purchases_finished_after_max" CHECK ("purchases"."finished_at" IS NULL OR "purchases"."finished_at" >= COALESCE("purchases"."opened_at", "purchases"."purchased_at"));--> statement-breakpoint
ALTER TABLE "user_product_reviews" ADD CONSTRAINT "upr_tolerance_range" CHECK ("user_product_reviews"."tolerance" BETWEEN 1 AND 5);--> statement-breakpoint
ALTER TABLE "user_product_reviews" ADD CONSTRAINT "upr_efficacy_range" CHECK ("user_product_reviews"."efficacy" BETWEEN 1 AND 5);--> statement-breakpoint
ALTER TABLE "user_product_reviews" ADD CONSTRAINT "upr_sensoriality_range" CHECK ("user_product_reviews"."sensoriality" BETWEEN 1 AND 5);--> statement-breakpoint
ALTER TABLE "user_product_reviews" ADD CONSTRAINT "upr_stability_range" CHECK ("user_product_reviews"."stability" BETWEEN 1 AND 5);--> statement-breakpoint
ALTER TABLE "user_product_reviews" ADD CONSTRAINT "upr_mixability_range" CHECK ("user_product_reviews"."mixability" BETWEEN 1 AND 5);--> statement-breakpoint
ALTER TABLE "user_product_reviews" ADD CONSTRAINT "upr_value_for_money_range" CHECK ("user_product_reviews"."value_for_money" BETWEEN 1 AND 5);--> statement-breakpoint
ALTER TABLE "user_products" ADD CONSTRAINT "user_products_sentiment_range" CHECK ("user_products"."sentiment" BETWEEN 1 AND 5);