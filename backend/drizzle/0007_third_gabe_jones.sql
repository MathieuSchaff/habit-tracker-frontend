ALTER TABLE "ingredient_dermo_profiles" DROP COLUMN "id";--> statement-breakpoint
ALTER TABLE "products" ADD COLUMN "category" text;--> statement-breakpoint
ALTER TABLE "ingredient_dermo_profiles" ADD PRIMARY KEY ("ingredient_id");
