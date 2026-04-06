ALTER TABLE "user_preferences" ADD COLUMN "ai_consent" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "profiles" ADD COLUMN "profile_public" boolean DEFAULT false NOT NULL;