DROP POLICY "subtasks_tenant_isolation" ON "subtasks" CASCADE;--> statement-breakpoint
DROP POLICY "subtasks_admin_bypass" ON "subtasks" CASCADE;--> statement-breakpoint
DROP TABLE "subtasks" CASCADE;--> statement-breakpoint
DROP POLICY "tasks_tenant_isolation" ON "tasks" CASCADE;--> statement-breakpoint
DROP POLICY "tasks_admin_bypass" ON "tasks" CASCADE;--> statement-breakpoint
DROP TABLE "tasks" CASCADE;--> statement-breakpoint
DROP TYPE "public"."task_energy";--> statement-breakpoint
DROP TYPE "public"."task_status";