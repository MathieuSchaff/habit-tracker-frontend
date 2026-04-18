ALTER TABLE "ingredient_dermo_profiles" DROP CONSTRAINT "ingredient_dermo_profiles_ingredient_id_unique";--> statement-breakpoint
ALTER TABLE "ingredient_dermo_profiles" ALTER COLUMN "irritation_potential" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "ingredient_dermo_profiles" ALTER COLUMN "is_filler" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "user_ingredient_analysis_score" ALTER COLUMN "updated_at" SET DATA TYPE timestamp with time zone;--> statement-breakpoint
ALTER TABLE "user_ingredient_analysis_score" ALTER COLUMN "updated_at" SET DEFAULT now();--> statement-breakpoint
ALTER TABLE "ingredient_dermo_profiles" ADD CONSTRAINT "comedogenicity_range" CHECK ("ingredient_dermo_profiles"."comedogenicity" BETWEEN 0 AND 5);