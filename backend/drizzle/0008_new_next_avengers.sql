-- Drop old junction tables and unified tags table (all tag data will be reseeded)
DROP TABLE IF EXISTS "ingredient_tags" CASCADE;
--> statement-breakpoint
DROP TABLE IF EXISTS "product_tags" CASCADE;
--> statement-breakpoint
DROP TABLE IF EXISTS "tags" CASCADE;
--> statement-breakpoint

-- Create new tag definition tables
CREATE TABLE "ingredient_tags" (
	"id" uuid PRIMARY KEY DEFAULT uuidv7() NOT NULL,
	"slug" text NOT NULL,
	"label" text NOT NULL,
	"type" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "product_tags" (
	"id" uuid PRIMARY KEY DEFAULT uuidv7() NOT NULL,
	"slug" text NOT NULL,
	"label" text NOT NULL,
	"type" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint

-- Create new junction tables with composite PKs
CREATE TABLE "tag_ingredients" (
	"ingredient_tag_id" uuid NOT NULL,
	"ingredient_id" uuid NOT NULL,
	"relevance" "relevance" DEFAULT 'secondary' NOT NULL,
	CONSTRAINT "tag_ingredients_ingredient_tag_id_ingredient_id_pk" PRIMARY KEY("ingredient_tag_id","ingredient_id")
);
--> statement-breakpoint
CREATE TABLE "tag_products" (
	"product_tag_id" uuid NOT NULL,
	"product_id" uuid NOT NULL,
	"relevance" "relevance" DEFAULT 'secondary' NOT NULL,
	CONSTRAINT "tag_products_product_tag_id_product_id_pk" PRIMARY KEY("product_tag_id","product_id")
);
--> statement-breakpoint

-- Indexes on definition tables
CREATE UNIQUE INDEX "ingredient_tags_slug_unique" ON "ingredient_tags" USING btree ("slug");
--> statement-breakpoint
CREATE INDEX "ingredient_tags_type_idx" ON "ingredient_tags" USING btree ("type");
--> statement-breakpoint
CREATE UNIQUE INDEX "product_tags_slug_unique" ON "product_tags" USING btree ("slug");
--> statement-breakpoint
CREATE INDEX "product_tags_type_idx" ON "product_tags" USING btree ("type");
--> statement-breakpoint

-- Foreign keys on junction tables
ALTER TABLE "tag_ingredients" ADD CONSTRAINT "tag_ingredients_ingredient_tag_id_ingredient_tags_id_fk" FOREIGN KEY ("ingredient_tag_id") REFERENCES "public"."ingredient_tags"("id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "tag_ingredients" ADD CONSTRAINT "tag_ingredients_ingredient_id_ingredients_id_fk" FOREIGN KEY ("ingredient_id") REFERENCES "public"."ingredients"("id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "tag_products" ADD CONSTRAINT "tag_products_product_tag_id_product_tags_id_fk" FOREIGN KEY ("product_tag_id") REFERENCES "public"."product_tags"("id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "tag_products" ADD CONSTRAINT "tag_products_product_id_products_id_fk" FOREIGN KEY ("product_id") REFERENCES "public"."products"("id") ON DELETE cascade ON UPDATE no action;
