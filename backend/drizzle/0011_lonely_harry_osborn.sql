CREATE TYPE "public"."blog_category" AS ENUM('skincare', 'haircare', 'dental', 'nutrition', 'supplements', 'phytotherapie', 'routines', 'science', 'lifestyle');--> statement-breakpoint
ALTER TABLE "articles" ALTER COLUMN "category" SET DATA TYPE "public"."blog_category" USING "category"::"public"."blog_category";--> statement-breakpoint
ALTER TABLE "ingredients" ADD COLUMN "type" text DEFAULT 'skincare' NOT NULL;--> statement-breakpoint
CREATE INDEX "ingredients_type_idx" ON "ingredients" USING btree ("type");