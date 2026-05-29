CREATE OR REPLACE FUNCTION norm(text) RETURNS text
  LANGUAGE sql IMMUTABLE
  AS $$ SELECT lower(trim(regexp_replace($1, '\s+', ' ', 'g'))) $$;--> statement-breakpoint
CREATE TYPE "public"."catalog_quality" AS ENUM('unverified', 'verified');--> statement-breakpoint
ALTER TYPE "public"."ban_scope" ADD VALUE 'ingredient_create';--> statement-breakpoint
DROP INDEX "ingredients_slug_unique";--> statement-breakpoint
DROP INDEX "products_name_brand_unique";--> statement-breakpoint
ALTER TABLE "ingredients" ADD COLUMN "moderation_status" "moderation_status" DEFAULT 'visible' NOT NULL;--> statement-breakpoint
ALTER TABLE "ingredients" ADD COLUMN "moderated_by" uuid;--> statement-breakpoint
ALTER TABLE "ingredients" ADD COLUMN "moderated_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "ingredients" ADD COLUMN "moderation_reason" text;--> statement-breakpoint
ALTER TABLE "ingredients" ADD COLUMN "catalog_quality" "catalog_quality" DEFAULT 'unverified' NOT NULL;--> statement-breakpoint
ALTER TABLE "ingredients" ADD COLUMN "verified_by" uuid;--> statement-breakpoint
ALTER TABLE "ingredients" ADD COLUMN "verified_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "products" ADD COLUMN "moderation_status" "moderation_status" DEFAULT 'visible' NOT NULL;--> statement-breakpoint
ALTER TABLE "products" ADD COLUMN "moderated_by" uuid;--> statement-breakpoint
ALTER TABLE "products" ADD COLUMN "moderated_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "products" ADD COLUMN "moderation_reason" text;--> statement-breakpoint
ALTER TABLE "products" ADD COLUMN "catalog_quality" "catalog_quality" DEFAULT 'unverified' NOT NULL;--> statement-breakpoint
ALTER TABLE "products" ADD COLUMN "verified_by" uuid;--> statement-breakpoint
ALTER TABLE "products" ADD COLUMN "verified_at" timestamp with time zone;--> statement-breakpoint
UPDATE "ingredients" SET "catalog_quality" = 'verified';--> statement-breakpoint
UPDATE "products" SET "catalog_quality" = 'verified';--> statement-breakpoint
ALTER TABLE "ingredients" ADD CONSTRAINT "ingredients_moderated_by_users_id_fk" FOREIGN KEY ("moderated_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ingredients" ADD CONSTRAINT "ingredients_verified_by_users_id_fk" FOREIGN KEY ("verified_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "products" ADD CONSTRAINT "products_moderated_by_users_id_fk" FOREIGN KEY ("moderated_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "products" ADD CONSTRAINT "products_verified_by_users_id_fk" FOREIGN KEY ("verified_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "ingredients_slug_unique_visible" ON "ingredients" USING btree ("slug") WHERE "ingredients"."moderation_status" = 'visible';--> statement-breakpoint
CREATE UNIQUE INDEX "products_name_brand_unique_visible" ON "products" USING btree (norm("name"),norm("brand")) WHERE "products"."moderation_status" = 'visible';--> statement-breakpoint
ALTER TABLE "ingredients" ADD CONSTRAINT "ingredients_verify_stamp_check" CHECK ("ingredients"."catalog_quality" = 'verified' OR ("ingredients"."verified_by" IS NULL AND "ingredients"."verified_at" IS NULL));--> statement-breakpoint
ALTER TABLE "products" ADD CONSTRAINT "products_verify_stamp_check" CHECK ("products"."catalog_quality" = 'verified' OR ("products"."verified_by" IS NULL AND "products"."verified_at" IS NULL));