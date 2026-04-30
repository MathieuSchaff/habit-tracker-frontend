CREATE TABLE "product_comparison_items" (
	"comparison_id" uuid NOT NULL,
	"product_id" uuid NOT NULL,
	"position" integer NOT NULL,
	CONSTRAINT "product_comparison_items_comparison_id_product_id_pk" PRIMARY KEY("comparison_id","product_id")
);
--> statement-breakpoint
CREATE TABLE "product_comparisons" (
	"id" uuid PRIMARY KEY DEFAULT uuidv7() NOT NULL,
	"user_id" uuid NOT NULL,
	"name" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "product_comparison_items" ADD CONSTRAINT "product_comparison_items_comparison_id_product_comparisons_id_fk" FOREIGN KEY ("comparison_id") REFERENCES "public"."product_comparisons"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "product_comparison_items" ADD CONSTRAINT "product_comparison_items_product_id_products_id_fk" FOREIGN KEY ("product_id") REFERENCES "public"."products"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "product_comparisons" ADD CONSTRAINT "product_comparisons_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "product_comparison_items_comparison_idx" ON "product_comparison_items" USING btree ("comparison_id");--> statement-breakpoint
CREATE INDEX "product_comparisons_user_idx" ON "product_comparisons" USING btree ("user_id");--> statement-breakpoint
ALTER TABLE "product_comparisons" ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
ALTER TABLE "product_comparisons" FORCE ROW LEVEL SECURITY;
--> statement-breakpoint
CREATE POLICY "product_comparisons_tenant_isolation" ON "product_comparisons"
  AS PERMISSIVE FOR ALL TO "app_runtime"
  USING (user_id = (SELECT current_setting('app.user_id', true)::uuid))
  WITH CHECK (user_id = (SELECT current_setting('app.user_id', true)::uuid));
--> statement-breakpoint
CREATE POLICY "product_comparisons_admin_bypass" ON "product_comparisons"
  AS PERMISSIVE FOR ALL TO "app_runtime"
  USING ((SELECT current_setting('app.role', true)) = 'admin')
  WITH CHECK ((SELECT current_setting('app.role', true)) = 'admin');
--> statement-breakpoint
ALTER TABLE "product_comparison_items" ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
ALTER TABLE "product_comparison_items" FORCE ROW LEVEL SECURITY;
--> statement-breakpoint
CREATE POLICY "product_comparison_items_tenant_isolation" ON "product_comparison_items"
  AS PERMISSIVE FOR ALL TO "app_runtime"
  USING (
    EXISTS (
      SELECT 1 FROM product_comparisons c
      WHERE c.id = product_comparison_items.comparison_id
        AND c.user_id = (SELECT current_setting('app.user_id', true)::uuid)
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM product_comparisons c
      WHERE c.id = product_comparison_items.comparison_id
        AND c.user_id = (SELECT current_setting('app.user_id', true)::uuid)
    )
  );
--> statement-breakpoint
CREATE POLICY "product_comparison_items_admin_bypass" ON "product_comparison_items"
  AS PERMISSIVE FOR ALL TO "app_runtime"
  USING ((SELECT current_setting('app.role', true)) = 'admin')
  WITH CHECK ((SELECT current_setting('app.role', true)) = 'admin');