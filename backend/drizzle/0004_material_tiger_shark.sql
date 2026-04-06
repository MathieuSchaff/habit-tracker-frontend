CREATE TABLE "user_dermo_profiles" (
	"user_id" uuid PRIMARY KEY NOT NULL,
	"skin_types" text[],
	"fitzpatrick_type" integer,
	"skin_concerns" text[] DEFAULT '{}' NOT NULL,
	"private_notes" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "profiles" ADD COLUMN "links" jsonb DEFAULT '[]'::jsonb NOT NULL;--> statement-breakpoint
ALTER TABLE "user_dermo_profiles" ADD CONSTRAINT "user_dermo_profiles_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;