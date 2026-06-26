CREATE TYPE "public"."reactable_type" AS ENUM('post', 'thread', 'post_reply', 'thread_reply');--> statement-breakpoint
CREATE TYPE "public"."reaction_kind" AS ENUM('merci', 'moi-aussi', 'soutien');--> statement-breakpoint
CREATE TABLE "social_reactions" (
	"id" uuid PRIMARY KEY DEFAULT uuidv7() NOT NULL,
	"reactable_type" "reactable_type" NOT NULL,
	"reactable_id" uuid NOT NULL,
	"user_id" uuid,
	"kind" "reaction_kind" NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "social_reactions_unique" UNIQUE("reactable_type","reactable_id","user_id","kind")
);
--> statement-breakpoint
ALTER TABLE "social_reactions" ADD CONSTRAINT "social_reactions_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "social_reactions_target_idx" ON "social_reactions" USING btree ("reactable_type","reactable_id");--> statement-breakpoint
CREATE INDEX "social_reactions_user_idx" ON "social_reactions" USING btree ("user_id");