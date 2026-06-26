CREATE TYPE "public"."social_post_tone" AS ENUM('principal', 'coup-de-gueule');--> statement-breakpoint
ALTER TYPE "public"."ban_scope" ADD VALUE 'social_post';--> statement-breakpoint
CREATE TABLE "social_post_replies" (
	"id" uuid PRIMARY KEY DEFAULT uuidv7() NOT NULL,
	"post_id" uuid NOT NULL,
	"author_id" uuid,
	"content" text NOT NULL,
	"moderation_status" "moderation_status" DEFAULT 'visible' NOT NULL,
	"moderated_by" uuid,
	"moderated_at" timestamp with time zone,
	"moderation_reason" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "social_posts" (
	"id" uuid PRIMARY KEY DEFAULT uuidv7() NOT NULL,
	"author_id" uuid,
	"tone" "social_post_tone" NOT NULL,
	"content" text NOT NULL,
	"product_id" uuid,
	"ingredient_id" uuid,
	"concern_slug" text,
	"moderation_status" "moderation_status" DEFAULT 'visible' NOT NULL,
	"moderated_by" uuid,
	"moderated_at" timestamp with time zone,
	"moderation_reason" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "social_posts_anchor_min1" CHECK (("social_posts"."product_id" IS NOT NULL)::int + ("social_posts"."ingredient_id" IS NOT NULL)::int + ("social_posts"."concern_slug" IS NOT NULL)::int >= 1)
);
--> statement-breakpoint
ALTER TABLE "social_post_replies" ADD CONSTRAINT "social_post_replies_post_id_social_posts_id_fk" FOREIGN KEY ("post_id") REFERENCES "public"."social_posts"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "social_post_replies" ADD CONSTRAINT "social_post_replies_author_id_users_id_fk" FOREIGN KEY ("author_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "social_post_replies" ADD CONSTRAINT "social_post_replies_moderated_by_users_id_fk" FOREIGN KEY ("moderated_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "social_posts" ADD CONSTRAINT "social_posts_author_id_users_id_fk" FOREIGN KEY ("author_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "social_posts" ADD CONSTRAINT "social_posts_product_id_products_id_fk" FOREIGN KEY ("product_id") REFERENCES "public"."products"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "social_posts" ADD CONSTRAINT "social_posts_ingredient_id_ingredients_id_fk" FOREIGN KEY ("ingredient_id") REFERENCES "public"."ingredients"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "social_posts" ADD CONSTRAINT "social_posts_moderated_by_users_id_fk" FOREIGN KEY ("moderated_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "social_post_replies_post_idx" ON "social_post_replies" USING btree ("post_id");--> statement-breakpoint
CREATE INDEX "social_post_replies_author_idx" ON "social_post_replies" USING btree ("author_id");--> statement-breakpoint
CREATE INDEX "social_posts_product_idx" ON "social_posts" USING btree ("product_id");--> statement-breakpoint
CREATE INDEX "social_posts_ingredient_idx" ON "social_posts" USING btree ("ingredient_id");--> statement-breakpoint
CREATE INDEX "social_posts_author_idx" ON "social_posts" USING btree ("author_id");--> statement-breakpoint
CREATE INDEX "social_posts_concern_idx" ON "social_posts" USING btree ("concern_slug");