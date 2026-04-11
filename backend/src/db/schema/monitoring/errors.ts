import { sql } from 'drizzle-orm'
import {
  index,
  integer,
  jsonb,
  pgEnum,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from 'drizzle-orm/pg-core'

import { users } from '../auth/users'

export const errorSourceEnum = pgEnum('error_source', ['backend', 'frontend'])

export const errorGroups = pgTable(
  'error_groups',
  {
    id: uuid('id').primaryKey().default(sql`uuidv7()`),
    fingerprint: text('fingerprint').notNull(),
    source: errorSourceEnum('source').notNull(),
    message: text('message').notNull(),
    stack: text('stack'),
    context: jsonb('context'),
    count: integer('count').notNull().default(1),
    firstSeenAt: timestamp('first_seen_at', { withTimezone: true }).notNull().defaultNow(),
    lastSeenAt: timestamp('last_seen_at', { withTimezone: true }).notNull().defaultNow(),
    resolvedAt: timestamp('resolved_at', { withTimezone: true }),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    uniqueIndex('error_groups_fingerprint_idx').on(t.fingerprint),
    index('error_groups_resolved_last_seen_idx').on(t.resolvedAt, t.lastSeenAt),
    index('error_groups_source_idx').on(t.source),
  ]
)

export const errorOccurrences = pgTable(
  'error_occurrences',
  {
    id: uuid('id').primaryKey().default(sql`uuidv7()`),
    groupId: uuid('group_id')
      .notNull()
      .references(() => errorGroups.id, { onDelete: 'cascade' }),
    userId: uuid('user_id').references(() => users.id, { onDelete: 'set null' }),
    occurredAt: timestamp('occurred_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    index('error_occurrences_group_idx').on(t.groupId),
    index('error_occurrences_user_idx').on(t.userId),
    index('error_occurrences_group_occurred_idx').on(t.groupId, t.occurredAt),
    index('error_occurrences_user_occurred_idx').on(t.userId, t.occurredAt),
  ]
)

export type ErrorGroup = typeof errorGroups.$inferSelect
export type ErrorGroupInsert = typeof errorGroups.$inferInsert
export type ErrorOccurrence = typeof errorOccurrences.$inferSelect
export type ErrorOccurrenceInsert = typeof errorOccurrences.$inferInsert
