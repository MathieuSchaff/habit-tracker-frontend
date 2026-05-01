ALTER TABLE "discussion_threads" DROP CONSTRAINT "discussion_threads_product_id_products_id_fk";
--> statement-breakpoint
ALTER TABLE "discussion_threads" DROP CONSTRAINT "discussion_threads_ingredient_id_ingredients_id_fk";
--> statement-breakpoint
ALTER TABLE "discussion_threads" ADD CONSTRAINT "discussion_threads_product_id_products_id_fk" FOREIGN KEY ("product_id") REFERENCES "public"."products"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "discussion_threads" ADD CONSTRAINT "discussion_threads_ingredient_id_ingredients_id_fk" FOREIGN KEY ("ingredient_id") REFERENCES "public"."ingredients"("id") ON DELETE restrict ON UPDATE no action;