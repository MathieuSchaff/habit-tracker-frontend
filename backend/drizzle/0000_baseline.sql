CREATE EXTENSION IF NOT EXISTS pg_trgm;--> statement-breakpoint
CREATE TYPE "public"."habit_check_status" AS ENUM('pending', 'done', 'skipped');--> statement-breakpoint
CREATE TYPE "public"."habit_frequency" AS ENUM('daily', 'weekly', 'monthly', 'every_n_days');--> statement-breakpoint
CREATE TYPE "public"."irritation_potential" AS ENUM('low', 'moderate', 'high');--> statement-breakpoint
CREATE TYPE "public"."wellbeing_metric" AS ENUM('energy', 'sleep', 'fog', 'stress', 'mood', 'skin', 'pain');--> statement-breakpoint
CREATE TYPE "public"."collaborator_role" AS ENUM('editor');--> statement-breakpoint
CREATE TYPE "public"."relevance" AS ENUM('primary', 'secondary', 'avoid');--> statement-breakpoint
CREATE TYPE "public"."task_energy" AS ENUM('low', 'medium', 'high');--> statement-breakpoint
CREATE TYPE "public"."task_status" AS ENUM('inbox', 'active', 'done', 'snoozed');--> statement-breakpoint
CREATE TYPE "public"."ban_scope" AS ENUM('ingredient_edit', 'product_edit', 'product_create', 'global');--> statement-breakpoint
CREATE TYPE "public"."display_scale" AS ENUM('out_of_5', 'out_of_10', 'out_of_20', 'percentage');--> statement-breakpoint
CREATE TYPE "public"."repurchase_flag" AS ENUM('yes', 'no', 'unsure');--> statement-breakpoint
CREATE TYPE "public"."user_product_status" AS ENUM('in_stock', 'wishlist', 'watched', 'holy_grail', 'archived', 'avoided');--> statement-breakpoint
CREATE TYPE "public"."user_role" AS ENUM('user', 'admin');--> statement-breakpoint
CREATE TABLE "email_verifications" (
	"id" uuid PRIMARY KEY DEFAULT uuidv7() NOT NULL,
	"user_id" uuid NOT NULL,
	"token_hash" text NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	"used_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "habit_checks" (
	"id" uuid PRIMARY KEY DEFAULT uuidv7() NOT NULL,
	"user_id" uuid NOT NULL,
	"habit_id" uuid NOT NULL,
	"scheduled_date" date NOT NULL,
	"timing_id" uuid,
	"status" "habit_check_status" DEFAULT 'pending' NOT NULL,
	"actual_time" text,
	"completed_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "habit_periods" (
	"id" uuid PRIMARY KEY DEFAULT uuidv7() NOT NULL,
	"habit_id" uuid NOT NULL,
	"start_date" date NOT NULL,
	"end_date" date NOT NULL,
	"active_months" integer[],
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "habit_products" (
	"id" uuid PRIMARY KEY DEFAULT uuidv7() NOT NULL,
	"habit_id" uuid NOT NULL,
	"product_id" uuid NOT NULL,
	"dosage" text,
	"order" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "habit_reminders" (
	"id" uuid PRIMARY KEY DEFAULT uuidv7() NOT NULL,
	"timing_id" uuid NOT NULL,
	"before_minutes" integer NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "habit_schedules" (
	"id" uuid PRIMARY KEY DEFAULT uuidv7() NOT NULL,
	"habit_id" uuid NOT NULL,
	"frequency" "habit_frequency" NOT NULL,
	"days_of_week" integer[],
	"days_of_month" integer[],
	"interval_days" integer,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "habit_timings" (
	"id" uuid PRIMARY KEY DEFAULT uuidv7() NOT NULL,
	"schedule_id" uuid NOT NULL,
	"day" integer,
	"time" text NOT NULL,
	"label" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "habits" (
	"id" uuid PRIMARY KEY DEFAULT uuidv7() NOT NULL,
	"user_id" uuid NOT NULL,
	"name" text NOT NULL,
	"category" text NOT NULL,
	"position" integer DEFAULT 0 NOT NULL,
	"archived_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "ingredient_dermo_profiles" (
	"id" uuid PRIMARY KEY DEFAULT uuidv7() NOT NULL,
	"ingredient_id" uuid NOT NULL,
	"irritation_potential" "irritation_potential" DEFAULT 'low',
	"comedogenicity" integer,
	"is_filler" boolean DEFAULT false,
	"functions" text[] DEFAULT '{}' NOT NULL,
	"skin_targets" text[] DEFAULT '{}' NOT NULL,
	CONSTRAINT "ingredient_dermo_profiles_ingredient_id_unique" UNIQUE("ingredient_id")
);
--> statement-breakpoint
CREATE TABLE "ingredient_edits" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"ingredient_id" uuid NOT NULL,
	"edited_by" uuid NOT NULL,
	"changes" jsonb NOT NULL,
	"summary" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "ingredients" (
	"id" uuid PRIMARY KEY DEFAULT uuidv7() NOT NULL,
	"created_by" uuid NOT NULL,
	"name" text NOT NULL,
	"slug" text NOT NULL,
	"description" text DEFAULT '' NOT NULL,
	"content" text DEFAULT '' NOT NULL,
	"category" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "habit_check_products" (
	"id" uuid PRIMARY KEY DEFAULT uuidv7() NOT NULL,
	"check_id" uuid NOT NULL,
	"habit_product_id" uuid NOT NULL,
	"product_id" uuid NOT NULL,
	"used" boolean DEFAULT true NOT NULL,
	"actual_dosage" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "wellbeing_logs" (
	"id" uuid PRIMARY KEY DEFAULT uuidv7() NOT NULL,
	"user_id" uuid NOT NULL,
	"metric" "wellbeing_metric" NOT NULL,
	"value" numeric(5, 2) NOT NULL,
	"unit" text,
	"note" text,
	"logged_at" timestamp with time zone DEFAULT now() NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "product_ingredients" (
	"id" uuid PRIMARY KEY DEFAULT uuidv7() NOT NULL,
	"product_id" uuid NOT NULL,
	"ingredient_id" uuid NOT NULL,
	"concentration_value" numeric,
	"concentration_unit" text,
	"concentration_per" text,
	"notes" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "product_edits" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"product_id" uuid NOT NULL,
	"edited_by" uuid NOT NULL,
	"changes" jsonb NOT NULL,
	"summary" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "products" (
	"id" uuid PRIMARY KEY DEFAULT uuidv7() NOT NULL,
	"created_by" uuid NOT NULL,
	"name" text NOT NULL,
	"brand" text NOT NULL,
	"kind" text DEFAULT 'Pas spécifié' NOT NULL,
	"unit" text NOT NULL,
	"inci" text,
	"description" text,
	"total_amount" integer,
	"amount_unit" text,
	"slug" text NOT NULL,
	"url" text,
	"image_url" text,
	"notes" text,
	"price_cents" integer,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "purchases" (
	"id" uuid PRIMARY KEY DEFAULT uuidv7() NOT NULL,
	"user_product_id" uuid NOT NULL,
	"purchased_at" date NOT NULL,
	"price_paid_cents" integer,
	"opened_at" date,
	"finished_at" date,
	"expires_at" date,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "ingredient_tags" (
	"id" uuid PRIMARY KEY DEFAULT uuidv7() NOT NULL,
	"ingredient_id" uuid NOT NULL,
	"tag_id" uuid NOT NULL,
	"relevance" "relevance" DEFAULT 'secondary' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "product_tags" (
	"id" uuid PRIMARY KEY DEFAULT uuidv7() NOT NULL,
	"product_id" uuid NOT NULL,
	"tag_id" uuid NOT NULL,
	"relevance" "relevance" DEFAULT 'secondary' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "tags" (
	"id" uuid PRIMARY KEY DEFAULT uuidv7() NOT NULL,
	"name" text NOT NULL,
	"slug" text NOT NULL,
	"category" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "subtasks" (
	"id" uuid PRIMARY KEY DEFAULT uuidv7() NOT NULL,
	"task_id" uuid NOT NULL,
	"title" text NOT NULL,
	"completed" boolean DEFAULT false NOT NULL,
	"order" integer NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "tasks" (
	"id" uuid PRIMARY KEY DEFAULT uuidv7() NOT NULL,
	"user_id" uuid NOT NULL,
	"title" text NOT NULL,
	"energy" "task_energy",
	"status" "task_status" DEFAULT 'inbox' NOT NULL,
	"snoozed_until" date,
	"done_at" timestamp with time zone,
	"focus_duration_minutes" integer,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "user_bans" (
	"id" uuid PRIMARY KEY DEFAULT uuidv7() NOT NULL,
	"user_id" uuid NOT NULL,
	"scope" "ban_scope" NOT NULL,
	"reason" text,
	"banned_by" uuid NOT NULL,
	"expires_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "user_ingredient_analysis_score" (
	"id" uuid PRIMARY KEY DEFAULT uuidv7() NOT NULL,
	"user_id" uuid NOT NULL,
	"ingredient_id" uuid NOT NULL,
	"suspicion_score" numeric DEFAULT '0',
	"favorite_score" numeric DEFAULT '0',
	"is_suspect" boolean DEFAULT false,
	"is_favorite" boolean DEFAULT false,
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "user_preferences" (
	"user_id" uuid PRIMARY KEY NOT NULL,
	"display_scale" "display_scale" DEFAULT 'out_of_20' NOT NULL,
	"criteria_weights" jsonb DEFAULT '{"tolerance":1,"efficacy":1,"sensoriality":1,"stability":1,"mixability":1,"valueForMoney":1}'::jsonb NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "user_product_reviews" (
	"id" uuid PRIMARY KEY DEFAULT uuidv7() NOT NULL,
	"user_product_id" uuid NOT NULL,
	"tolerance" integer,
	"efficacy" integer,
	"sensoriality" integer,
	"stability" integer,
	"mixability" integer,
	"value_for_money" integer,
	"comment" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "user_product_reviews_user_product_id_unique" UNIQUE("user_product_id")
);
--> statement-breakpoint
CREATE TABLE "user_products" (
	"id" uuid PRIMARY KEY DEFAULT uuidv7() NOT NULL,
	"user_id" uuid NOT NULL,
	"product_id" uuid NOT NULL,
	"status" "user_product_status" DEFAULT 'in_stock' NOT NULL,
	"sentiment" integer,
	"would_repurchase" "repurchase_flag",
	"comment" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "profiles" (
	"user_id" uuid PRIMARY KEY NOT NULL,
	"username" varchar(32),
	"avatar_url" text,
	"bio" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "refresh_tokens" (
	"id" uuid PRIMARY KEY DEFAULT uuidv7() NOT NULL,
	"user_id" uuid NOT NULL,
	"jti_hash" text NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	"revoked_at" timestamp with time zone,
	"last_used_at" timestamp with time zone,
	"ip" varchar(45),
	"user_agent" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone,
	CONSTRAINT "revoked_after_created" CHECK ("refresh_tokens"."revoked_at" IS NULL OR "refresh_tokens"."revoked_at" >= "refresh_tokens"."created_at"),
	CONSTRAINT "expires_in_future" CHECK ("refresh_tokens"."expires_at" > "refresh_tokens"."created_at")
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" uuid PRIMARY KEY DEFAULT uuidv7() NOT NULL,
	"email" varchar(320) NOT NULL,
	"password_hash" text,
	"google_sub" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"email_verified_at" timestamp with time zone,
	"role" "user_role" DEFAULT 'user' NOT NULL,
	"deleted_at" timestamp with time zone
);
--> statement-breakpoint
ALTER TABLE "email_verifications" ADD CONSTRAINT "email_verifications_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "habit_checks" ADD CONSTRAINT "habit_checks_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "habit_checks" ADD CONSTRAINT "habit_checks_habit_id_habits_id_fk" FOREIGN KEY ("habit_id") REFERENCES "public"."habits"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "habit_checks" ADD CONSTRAINT "habit_checks_timing_id_habit_timings_id_fk" FOREIGN KEY ("timing_id") REFERENCES "public"."habit_timings"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "habit_periods" ADD CONSTRAINT "habit_periods_habit_id_habits_id_fk" FOREIGN KEY ("habit_id") REFERENCES "public"."habits"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "habit_products" ADD CONSTRAINT "habit_products_habit_id_habits_id_fk" FOREIGN KEY ("habit_id") REFERENCES "public"."habits"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "habit_products" ADD CONSTRAINT "habit_products_product_id_products_id_fk" FOREIGN KEY ("product_id") REFERENCES "public"."products"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "habit_reminders" ADD CONSTRAINT "habit_reminders_timing_id_habit_timings_id_fk" FOREIGN KEY ("timing_id") REFERENCES "public"."habit_timings"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "habit_schedules" ADD CONSTRAINT "habit_schedules_habit_id_habits_id_fk" FOREIGN KEY ("habit_id") REFERENCES "public"."habits"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "habit_timings" ADD CONSTRAINT "habit_timings_schedule_id_habit_schedules_id_fk" FOREIGN KEY ("schedule_id") REFERENCES "public"."habit_schedules"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "habits" ADD CONSTRAINT "habits_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ingredient_dermo_profiles" ADD CONSTRAINT "ingredient_dermo_profiles_ingredient_id_ingredients_id_fk" FOREIGN KEY ("ingredient_id") REFERENCES "public"."ingredients"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ingredient_edits" ADD CONSTRAINT "ingredient_edits_ingredient_id_ingredients_id_fk" FOREIGN KEY ("ingredient_id") REFERENCES "public"."ingredients"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ingredient_edits" ADD CONSTRAINT "ingredient_edits_edited_by_users_id_fk" FOREIGN KEY ("edited_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ingredients" ADD CONSTRAINT "ingredients_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "habit_check_products" ADD CONSTRAINT "habit_check_products_check_id_habit_checks_id_fk" FOREIGN KEY ("check_id") REFERENCES "public"."habit_checks"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "habit_check_products" ADD CONSTRAINT "habit_check_products_habit_product_id_habit_products_id_fk" FOREIGN KEY ("habit_product_id") REFERENCES "public"."habit_products"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "habit_check_products" ADD CONSTRAINT "habit_check_products_product_id_products_id_fk" FOREIGN KEY ("product_id") REFERENCES "public"."products"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "wellbeing_logs" ADD CONSTRAINT "wellbeing_logs_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "product_ingredients" ADD CONSTRAINT "product_ingredients_product_id_products_id_fk" FOREIGN KEY ("product_id") REFERENCES "public"."products"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "product_ingredients" ADD CONSTRAINT "product_ingredients_ingredient_id_ingredients_id_fk" FOREIGN KEY ("ingredient_id") REFERENCES "public"."ingredients"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "product_edits" ADD CONSTRAINT "product_edits_product_id_products_id_fk" FOREIGN KEY ("product_id") REFERENCES "public"."products"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "product_edits" ADD CONSTRAINT "product_edits_edited_by_users_id_fk" FOREIGN KEY ("edited_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "products" ADD CONSTRAINT "products_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "purchases" ADD CONSTRAINT "purchases_user_product_id_user_products_id_fk" FOREIGN KEY ("user_product_id") REFERENCES "public"."user_products"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ingredient_tags" ADD CONSTRAINT "ingredient_tags_ingredient_id_ingredients_id_fk" FOREIGN KEY ("ingredient_id") REFERENCES "public"."ingredients"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ingredient_tags" ADD CONSTRAINT "ingredient_tags_tag_id_tags_id_fk" FOREIGN KEY ("tag_id") REFERENCES "public"."tags"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "product_tags" ADD CONSTRAINT "product_tags_product_id_products_id_fk" FOREIGN KEY ("product_id") REFERENCES "public"."products"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "product_tags" ADD CONSTRAINT "product_tags_tag_id_tags_id_fk" FOREIGN KEY ("tag_id") REFERENCES "public"."tags"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "subtasks" ADD CONSTRAINT "subtasks_task_id_tasks_id_fk" FOREIGN KEY ("task_id") REFERENCES "public"."tasks"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tasks" ADD CONSTRAINT "tasks_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_bans" ADD CONSTRAINT "user_bans_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_bans" ADD CONSTRAINT "user_bans_banned_by_users_id_fk" FOREIGN KEY ("banned_by") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_ingredient_analysis_score" ADD CONSTRAINT "user_ingredient_analysis_score_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_ingredient_analysis_score" ADD CONSTRAINT "user_ingredient_analysis_score_ingredient_id_ingredients_id_fk" FOREIGN KEY ("ingredient_id") REFERENCES "public"."ingredients"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_preferences" ADD CONSTRAINT "user_preferences_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_product_reviews" ADD CONSTRAINT "user_product_reviews_user_product_id_user_products_id_fk" FOREIGN KEY ("user_product_id") REFERENCES "public"."user_products"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_products" ADD CONSTRAINT "user_products_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_products" ADD CONSTRAINT "user_products_product_id_products_id_fk" FOREIGN KEY ("product_id") REFERENCES "public"."products"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "profiles" ADD CONSTRAINT "profiles_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "refresh_tokens" ADD CONSTRAINT "refresh_tokens_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "email_verifications_token_hash_ux" ON "email_verifications" USING btree ("token_hash");--> statement-breakpoint
CREATE INDEX "email_verifications_user_id_idx" ON "email_verifications" USING btree ("user_id");--> statement-breakpoint
CREATE UNIQUE INDEX "habit_checks_unique" ON "habit_checks" USING btree ("habit_id","scheduled_date","timing_id");--> statement-breakpoint
CREATE INDEX "habit_checks_user_date_idx" ON "habit_checks" USING btree ("user_id","scheduled_date");--> statement-breakpoint
CREATE INDEX "habit_checks_habit_idx" ON "habit_checks" USING btree ("habit_id");--> statement-breakpoint
CREATE UNIQUE INDEX "habit_periods_habit_unique" ON "habit_periods" USING btree ("habit_id");--> statement-breakpoint
CREATE INDEX "habit_periods_habit_idx" ON "habit_periods" USING btree ("habit_id");--> statement-breakpoint
CREATE UNIQUE INDEX "habit_products_unique" ON "habit_products" USING btree ("habit_id","product_id");--> statement-breakpoint
CREATE INDEX "habit_products_habit_idx" ON "habit_products" USING btree ("habit_id");--> statement-breakpoint
CREATE INDEX "habit_reminders_timing_idx" ON "habit_reminders" USING btree ("timing_id");--> statement-breakpoint
CREATE UNIQUE INDEX "habit_schedules_habit_unique" ON "habit_schedules" USING btree ("habit_id");--> statement-breakpoint
CREATE INDEX "habit_timings_schedule_idx" ON "habit_timings" USING btree ("schedule_id");--> statement-breakpoint
CREATE INDEX "habits_user_idx" ON "habits" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "habits_user_category_idx" ON "habits" USING btree ("user_id","category");--> statement-breakpoint
CREATE INDEX "ingredient_edits_ingredient_idx" ON "ingredient_edits" USING btree ("ingredient_id");--> statement-breakpoint
CREATE INDEX "ingredient_edits_user_idx" ON "ingredient_edits" USING btree ("edited_by");--> statement-breakpoint
CREATE UNIQUE INDEX "ingredients_slug_unique" ON "ingredients" USING btree ("slug");--> statement-breakpoint
CREATE INDEX "ingredients_name_idx" ON "ingredients" USING btree ("name");--> statement-breakpoint
CREATE INDEX "ingredients_category_idx" ON "ingredients" USING btree ("category");--> statement-breakpoint
CREATE UNIQUE INDEX "habit_check_products_unique" ON "habit_check_products" USING btree ("check_id","habit_product_id");--> statement-breakpoint
CREATE INDEX "habit_check_products_check_idx" ON "habit_check_products" USING btree ("check_id");--> statement-breakpoint
CREATE INDEX "habit_check_products_product_idx" ON "habit_check_products" USING btree ("product_id");--> statement-breakpoint
CREATE INDEX "wellbeing_logs_user_metric_logged_idx" ON "wellbeing_logs" USING btree ("user_id","metric","logged_at");--> statement-breakpoint
CREATE INDEX "wellbeing_logs_user_logged_idx" ON "wellbeing_logs" USING btree ("user_id","logged_at");--> statement-breakpoint
CREATE UNIQUE INDEX "product_ingredients_unique" ON "product_ingredients" USING btree ("product_id","ingredient_id");--> statement-breakpoint
CREATE INDEX "product_ingredients_product_idx" ON "product_ingredients" USING btree ("product_id");--> statement-breakpoint
CREATE INDEX "product_ingredients_ingredient_idx" ON "product_ingredients" USING btree ("ingredient_id");--> statement-breakpoint
CREATE INDEX "product_edits_product_idx" ON "product_edits" USING btree ("product_id");--> statement-breakpoint
CREATE INDEX "product_edits_user_idx" ON "product_edits" USING btree ("edited_by");--> statement-breakpoint
CREATE INDEX "products_kind_idx" ON "products" USING btree ("kind");--> statement-breakpoint
CREATE INDEX "products_created_by_idx" ON "products" USING btree ("created_by");--> statement-breakpoint
CREATE UNIQUE INDEX "products_name_brand_unique" ON "products" USING btree (lower("name"),lower("brand"));--> statement-breakpoint
CREATE UNIQUE INDEX "products_slug_unique" ON "products" USING btree ("slug");--> statement-breakpoint
CREATE INDEX "purchases_user_product_idx" ON "purchases" USING btree ("user_product_id");--> statement-breakpoint
CREATE INDEX "purchases_user_product_purchased_idx" ON "purchases" USING btree ("user_product_id","purchased_at");--> statement-breakpoint
CREATE UNIQUE INDEX "ingredient_tags_unique" ON "ingredient_tags" USING btree ("ingredient_id","tag_id");--> statement-breakpoint
CREATE INDEX "ingredient_tags_ingredient_idx" ON "ingredient_tags" USING btree ("ingredient_id");--> statement-breakpoint
CREATE INDEX "ingredient_tags_tag_idx" ON "ingredient_tags" USING btree ("tag_id");--> statement-breakpoint
CREATE UNIQUE INDEX "product_tags_unique" ON "product_tags" USING btree ("product_id","tag_id");--> statement-breakpoint
CREATE INDEX "product_tags_product_idx" ON "product_tags" USING btree ("product_id");--> statement-breakpoint
CREATE INDEX "product_tags_tag_idx" ON "product_tags" USING btree ("tag_id");--> statement-breakpoint
CREATE UNIQUE INDEX "tags_slug_unique" ON "tags" USING btree ("slug");--> statement-breakpoint
CREATE INDEX "tags_category_idx" ON "tags" USING btree ("category");--> statement-breakpoint
CREATE INDEX "subtasks_task_order_idx" ON "subtasks" USING btree ("task_id","order");--> statement-breakpoint
CREATE INDEX "tasks_user_status_idx" ON "tasks" USING btree ("user_id","status","created_at");--> statement-breakpoint
CREATE INDEX "tasks_user_done_idx" ON "tasks" USING btree ("user_id","done_at");--> statement-breakpoint
CREATE INDEX "user_bans_user_idx" ON "user_bans" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "user_bans_user_scope_idx" ON "user_bans" USING btree ("user_id","scope");--> statement-breakpoint
CREATE UNIQUE INDEX "user_ing_intel_idx" ON "user_ingredient_analysis_score" USING btree ("user_id","ingredient_id");--> statement-breakpoint
CREATE INDEX "user_product_reviews_user_product_idx" ON "user_product_reviews" USING btree ("user_product_id");--> statement-breakpoint
CREATE UNIQUE INDEX "user_products_user_product_unique" ON "user_products" USING btree ("user_id","product_id");--> statement-breakpoint
CREATE INDEX "user_products_user_idx" ON "user_products" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "user_products_status_idx" ON "user_products" USING btree ("status");--> statement-breakpoint
CREATE UNIQUE INDEX "profiles_username_ux" ON "profiles" USING btree ("username");--> statement-breakpoint
CREATE INDEX "profiles_username_idx" ON "profiles" USING btree ("username");--> statement-breakpoint
CREATE UNIQUE INDEX "refresh_tokens_jti_hash_ux" ON "refresh_tokens" USING btree ("jti_hash");--> statement-breakpoint
CREATE INDEX "refresh_tokens_active_user_idx" ON "refresh_tokens" USING btree ("user_id","expires_at") WHERE "refresh_tokens"."revoked_at" IS NULL;--> statement-breakpoint
CREATE INDEX "refresh_tokens_user_revoked_idx" ON "refresh_tokens" USING btree ("user_id","revoked_at");--> statement-breakpoint
CREATE INDEX "refresh_tokens_expires_revoked_idx" ON "refresh_tokens" USING btree ("expires_at","revoked_at");--> statement-breakpoint
CREATE UNIQUE INDEX "users_email_active_unique_idx" ON "users" USING btree (lower("email")) WHERE deleted_at IS NULL;--> statement-breakpoint
CREATE UNIQUE INDEX "users_google_sub_ux" ON "users" USING btree ("google_sub") WHERE google_sub IS NOT NULL;