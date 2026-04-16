ALTER TABLE "ingredients" ADD COLUMN "supplement_category" text;--> statement-breakpoint
CREATE INDEX "ingredients_supplement_category_idx" ON "ingredients" USING btree ("supplement_category");