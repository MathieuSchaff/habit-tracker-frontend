ALTER TABLE "user_products" ADD COLUMN "ressenti" text[] DEFAULT '{}' NOT NULL;--> statement-breakpoint
ALTER TABLE "user_products" ADD COLUMN "routine" text[] DEFAULT '{}' NOT NULL;--> statement-breakpoint
ALTER TABLE "user_products" ADD COLUMN "preferences" text[] DEFAULT '{}' NOT NULL;