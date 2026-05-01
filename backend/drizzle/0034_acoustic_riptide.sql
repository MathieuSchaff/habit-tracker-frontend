ALTER POLICY "subtasks_tenant_isolation" ON "subtasks" TO app_runtime USING (EXISTS (
        SELECT 1 FROM "tasks" p
        WHERE p.id = "subtasks"."task_id"
          AND p.user_id = (SELECT auth.uid())
      )) WITH CHECK (EXISTS (
        SELECT 1 FROM "tasks" p
        WHERE p.id = "subtasks"."task_id"
          AND p.user_id = (SELECT auth.uid())
      ));--> statement-breakpoint
ALTER POLICY "subtasks_admin_bypass" ON "subtasks" TO app_runtime USING ((SELECT auth.role()) = 'admin') WITH CHECK ((SELECT auth.role()) = 'admin');--> statement-breakpoint
ALTER POLICY "tasks_tenant_isolation" ON "tasks" TO app_runtime USING ("tasks"."user_id" = (SELECT auth.uid())) WITH CHECK ("tasks"."user_id" = (SELECT auth.uid()));--> statement-breakpoint
ALTER POLICY "tasks_admin_bypass" ON "tasks" TO app_runtime USING ((SELECT auth.role()) = 'admin') WITH CHECK ((SELECT auth.role()) = 'admin');