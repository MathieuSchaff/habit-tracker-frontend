import { sql } from 'drizzle-orm'
import {
  boolean,
  date,
  index,
  integer,
  pgEnum,
  pgPolicy,
  pgRole,
  pgTable,
  text,
  timestamp,
  uuid,
} from 'drizzle-orm/pg-core'

import { users } from '../auth/users'

export const taskEnergyEnum = pgEnum('task_energy', ['low', 'medium', 'high'])

export const taskStatusEnum = pgEnum('task_status', ['inbox', 'active', 'done', 'snoozed'])

export const tasks = pgTable(
  'tasks',
  {
    id: uuid('id').primaryKey().default(sql`uuidv7()`),
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    title: text('title').notNull(),
    energy: taskEnergyEnum('energy'),
    status: taskStatusEnum('status').notNull().default('inbox'),
    snoozedUntil: date('snoozed_until'),
    doneAt: timestamp('done_at', { withTimezone: true }),
    focusDurationMinutes: integer('focus_duration_minutes'),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true })
      .notNull()
      .defaultNow()
      .$onUpdate(() => new Date()),
  },
  (t) => [
    index('tasks_user_status_idx').on(t.userId, t.status, t.createdAt),
    index('tasks_user_done_idx').on(t.userId, t.doneAt),
    // Subquery form enables initPlan caching — faster on repeated row evaluations.
    pgPolicy('tasks_tenant_isolation', {
      as: 'permissive',
      for: 'all',
      to: pgRole('app_runtime').existing(),
      using: sql`${t.userId} = (SELECT current_setting('app.user_id', true)::uuid)`,
      withCheck: sql`${t.userId} = (SELECT current_setting('app.user_id', true)::uuid)`,
    }),
    pgPolicy('tasks_admin_bypass', {
      as: 'permissive',
      for: 'all',
      to: pgRole('app_runtime').existing(),
      using: sql`(SELECT current_setting('app.role', true)) = 'admin'`,
      withCheck: sql`(SELECT current_setting('app.role', true)) = 'admin'`,
    }),
  ]
).enableRLS()

export const subtasks = pgTable(
  'subtasks',
  {
    id: uuid('id').primaryKey().default(sql`uuidv7()`),
    taskId: uuid('task_id')
      .notNull()
      .references(() => tasks.id, { onDelete: 'cascade' }),
    title: text('title').notNull(),
    completed: boolean('completed').notNull().default(false),
    order: integer('order').notNull(),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    index('subtasks_task_order_idx').on(t.taskId, t.order),
    // Explicit user_id check keeps policy correct for owner role (bypasses RLS until FORCE RLS in T7).
    pgPolicy('subtasks_tenant_isolation', {
      as: 'permissive',
      for: 'all',
      to: pgRole('app_runtime').existing(),
      using: sql`EXISTS (
        SELECT 1 FROM ${tasks} p
        WHERE p.id = ${t.taskId}
          AND p.user_id = (SELECT current_setting('app.user_id', true)::uuid)
      )`,
      withCheck: sql`EXISTS (
        SELECT 1 FROM ${tasks} p
        WHERE p.id = ${t.taskId}
          AND p.user_id = (SELECT current_setting('app.user_id', true)::uuid)
      )`,
    }),
    pgPolicy('subtasks_admin_bypass', {
      as: 'permissive',
      for: 'all',
      to: pgRole('app_runtime').existing(),
      using: sql`(SELECT current_setting('app.role', true)) = 'admin'`,
      withCheck: sql`(SELECT current_setting('app.role', true)) = 'admin'`,
    }),
  ]
).enableRLS()

export type Task = typeof tasks.$inferSelect
export type TaskInsert = typeof tasks.$inferInsert
export type Subtask = typeof subtasks.$inferSelect
export type SubtaskInsert = typeof subtasks.$inferInsert
