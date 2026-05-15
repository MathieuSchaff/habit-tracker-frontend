CREATE TABLE "user_product_status_log" (
	"id" uuid PRIMARY KEY DEFAULT uuidv7() NOT NULL,
	"user_product_id" uuid NOT NULL,
	"user_id" uuid NOT NULL,
	"from_status" "user_product_status",
	"to_status" "user_product_status" NOT NULL,
	"reason" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "user_product_status_log" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "user_product_status_log" ADD CONSTRAINT "user_product_status_log_user_product_id_user_products_id_fk" FOREIGN KEY ("user_product_id") REFERENCES "public"."user_products"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_product_status_log" ADD CONSTRAINT "user_product_status_log_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "user_product_status_log_user_product_idx" ON "user_product_status_log" USING btree ("user_product_id","created_at");--> statement-breakpoint
CREATE POLICY "user_product_status_log_tenant_isolation" ON "user_product_status_log" AS PERMISSIVE FOR ALL TO "app_runtime" USING (EXISTS (
        SELECT 1 FROM "user_products" p
        WHERE p.id = "user_product_status_log"."user_product_id"
          AND p.user_id = (SELECT auth.uid())
      )) WITH CHECK (EXISTS (
        SELECT 1 FROM "user_products" p
        WHERE p.id = "user_product_status_log"."user_product_id"
          AND p.user_id = (SELECT auth.uid())
      ));--> statement-breakpoint
CREATE POLICY "user_product_status_log_admin_bypass" ON "user_product_status_log" AS PERMISSIVE FOR ALL TO "app_runtime" USING ((SELECT auth.role()) = 'admin') WITH CHECK ((SELECT auth.role()) = 'admin');