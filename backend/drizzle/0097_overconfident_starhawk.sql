ALTER TABLE "ingredients" ADD COLUMN "canonical_key" text;--> statement-breakpoint
CREATE INDEX "ingredients_canonical_key_idx" ON "ingredients" USING btree ("canonical_key");