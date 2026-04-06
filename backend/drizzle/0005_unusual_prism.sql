CREATE TABLE "discussion_replies" (
	"id" uuid PRIMARY KEY DEFAULT uuidv7() NOT NULL,
	"thread_id" uuid NOT NULL,
	"author_id" uuid,
	"content" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "discussion_threads" (
	"id" uuid PRIMARY KEY DEFAULT uuidv7() NOT NULL,
	"product_id" uuid,
	"ingredient_id" uuid,
	"author_id" uuid,
	"title" text NOT NULL,
	"content" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "discussion_threads_entity_xor" CHECK (("discussion_threads"."product_id" IS NOT NULL)::int + ("discussion_threads"."ingredient_id" IS NOT NULL)::int = 1)
);
--> statement-breakpoint
ALTER TABLE "discussion_replies" ADD CONSTRAINT "discussion_replies_thread_id_discussion_threads_id_fk" FOREIGN KEY ("thread_id") REFERENCES "public"."discussion_threads"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "discussion_replies" ADD CONSTRAINT "discussion_replies_author_id_users_id_fk" FOREIGN KEY ("author_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "discussion_threads" ADD CONSTRAINT "discussion_threads_product_id_products_id_fk" FOREIGN KEY ("product_id") REFERENCES "public"."products"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "discussion_threads" ADD CONSTRAINT "discussion_threads_ingredient_id_ingredients_id_fk" FOREIGN KEY ("ingredient_id") REFERENCES "public"."ingredients"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "discussion_threads" ADD CONSTRAINT "discussion_threads_author_id_users_id_fk" FOREIGN KEY ("author_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "discussion_replies_thread_idx" ON "discussion_replies" USING btree ("thread_id");--> statement-breakpoint
CREATE INDEX "discussion_replies_author_idx" ON "discussion_replies" USING btree ("author_id");--> statement-breakpoint
CREATE INDEX "discussion_threads_product_idx" ON "discussion_threads" USING btree ("product_id");--> statement-breakpoint
CREATE INDEX "discussion_threads_ingredient_idx" ON "discussion_threads" USING btree ("ingredient_id");--> statement-breakpoint
CREATE INDEX "discussion_threads_author_idx" ON "discussion_threads" USING btree ("author_id");