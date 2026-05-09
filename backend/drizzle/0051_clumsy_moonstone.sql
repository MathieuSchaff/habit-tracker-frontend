CREATE TABLE "brand_certifications" (
	"brand_normalized" text PRIMARY KEY NOT NULL,
	"brand_display" text NOT NULL,
	"is_vegan" boolean DEFAULT false NOT NULL,
	"is_cruelty_free" boolean DEFAULT false NOT NULL,
	"is_natural_certified" boolean DEFAULT false NOT NULL,
	"sources" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"notes" text,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
