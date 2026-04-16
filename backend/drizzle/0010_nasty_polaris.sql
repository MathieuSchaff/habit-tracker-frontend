CREATE TABLE "articles" (
	"id" uuid PRIMARY KEY DEFAULT uuidv7() NOT NULL,
	"created_by" uuid NOT NULL,
	"title" text NOT NULL,
	"slug" text NOT NULL,
	"excerpt" text,
	"content" text DEFAULT '' NOT NULL,
	"category" text NOT NULL,
	"cover_image_url" text,
	"published_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "articles" ADD CONSTRAINT "articles_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "articles_slug_unique" ON "articles" USING btree ("slug");--> statement-breakpoint
CREATE INDEX "articles_category_idx" ON "articles" USING btree ("category");--> statement-breakpoint
CREATE INDEX "articles_published_at_idx" ON "articles" USING btree ("published_at");--> statement-breakpoint
CREATE INDEX "articles_created_by_idx" ON "articles" USING btree ("created_by");