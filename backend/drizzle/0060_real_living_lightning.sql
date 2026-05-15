-- F4: drop holy_grail from user_product_status enum, fold into sentiment level 6.
-- See docs/04-design-ux/collection-page-audit.md F4.
-- Migration order: drop checks → text-coerce status → backfill data → swap enum → re-cast → re-check.

ALTER TABLE "user_products" DROP CONSTRAINT "user_products_sentiment_range";--> statement-breakpoint
ALTER TABLE "user_products" ALTER COLUMN "status" SET DATA TYPE text;--> statement-breakpoint
ALTER TABLE "user_products" ALTER COLUMN "status" SET DEFAULT 'in_stock'::text;--> statement-breakpoint

-- Backfill: every holy_grail row becomes in_stock + sentiment=6.
-- sentiment=6 wins regardless of previous sentiment (HG is a stronger signal
-- than the existing 1-5 ressenti). Existing sentiments on those rows are
-- overwritten intentionally.
UPDATE "user_products" SET "sentiment" = 6 WHERE "status" = 'holy_grail';--> statement-breakpoint
UPDATE "user_products" SET "status" = 'in_stock' WHERE "status" = 'holy_grail';--> statement-breakpoint

DROP TYPE "public"."user_product_status";--> statement-breakpoint
CREATE TYPE "public"."user_product_status" AS ENUM('in_stock', 'wishlist', 'watched', 'archived', 'avoided');--> statement-breakpoint
ALTER TABLE "user_products" ALTER COLUMN "status" SET DEFAULT 'in_stock'::"public"."user_product_status";--> statement-breakpoint
ALTER TABLE "user_products" ALTER COLUMN "status" SET DATA TYPE "public"."user_product_status" USING "status"::"public"."user_product_status";--> statement-breakpoint
ALTER TABLE "user_products" ADD CONSTRAINT "user_products_sentiment_range" CHECK ("user_products"."sentiment" BETWEEN 1 AND 6);
