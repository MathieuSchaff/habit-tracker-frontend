import { sql } from 'drizzle-orm'
import { index, pgEnum, pgTable, text, timestamp, uuid } from 'drizzle-orm/pg-core'

import { users } from '../auth/users'

export const securitySeverityEnum = pgEnum('security_severity', ['high', 'low'])

export const securityEvents = pgTable(
  'security_events',
  {
    id: uuid('id').primaryKey().default(sql`uuidv7()`),
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    severity: securitySeverityEnum('severity').notNull(),
    // e.g. 'javascript_url' | 'html_injection' | 'data_url' | 'http_url'
    eventType: text('event_type').notNull(),
    field: text('field').notNull(),
    // Truncated at 200 chars — enough for fingerprinting, not a full payload dump
    payload: text('payload').notNull(),
    route: text('route').notNull(),
    createdAt: timestamp('created_at', { withTimezone: true, mode: 'string' })
      .notNull()
      .defaultNow(),
  },
  (t) => [
    index('security_events_user_idx').on(t.userId),
    index('security_events_user_severity_created_idx').on(t.userId, t.severity, t.createdAt),
  ]
)

export type SecurityEvent = typeof securityEvents.$inferSelect
export type SecurityEventInsert = typeof securityEvents.$inferInsert
