import { sql } from 'drizzle-orm'
import {
  boolean,
  date,
  index,
  integer,
  pgEnum,
  pgTable,
  text,
  timestamp,
  uuid,
} from 'drizzle-orm/pg-core'

import { fkTenantPolicies, tenantPolicies } from '../_policies'
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
    snoozedUntil: date('snoozed_until', { mode: 'string' }),
    doneAt: timestamp('done_at', { withTimezone: true, mode: 'string' }),
    focusDurationMinutes: integer('focus_duration_minutes'),
    createdAt: timestamp('created_at', { withTimezone: true, mode: 'string' }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true, mode: 'string' })
      .notNull()
      .defaultNow()
      .$onUpdate(() => new Date().toISOString()),
  },
  (t) => [
    index('tasks_user_status_idx').on(t.userId, t.status, t.createdAt),
    index('tasks_user_done_idx').on(t.userId, t.doneAt),
    ...tenantPolicies('tasks', t.userId),
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
    createdAt: timestamp('created_at', { withTimezone: true, mode: 'string' }).notNull().defaultNow(),
  },
  (t) => [
    index('subtasks_task_order_idx').on(t.taskId, t.order),
    ...fkTenantPolicies(
      'subtasks',
      sql`EXISTS (
        SELECT 1 FROM ${tasks} p
        WHERE p.id = ${t.taskId}
          AND p.user_id = (SELECT auth.uid())
      )`
    ),
  ]
).enableRLS()

export type Task = typeof tasks.$inferSelect
export type TaskInsert = typeof tasks.$inferInsert
export type Subtask = typeof subtasks.$inferSelect
export type SubtaskInsert = typeof subtasks.$inferInsert
