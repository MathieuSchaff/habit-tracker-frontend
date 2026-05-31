import { sql } from 'drizzle-orm'
import { index, pgEnum, pgTable, text, timestamp, uuid } from 'drizzle-orm/pg-core'

import { moderationPolicies, tenantPolicies } from '../_policies'
import { users } from '../auth/users'

// Polymorphic target: targetId can reference user_product_reviews / discussion_threads
// / discussion_replies / users (for profile reports) / products / ingredients (catalogue
// sheets, S2). No FK constraint because the concrete table depends on targetType —
// admins resolve mismatches at review time.
export const reportTargetTypeEnum = pgEnum('report_target_type', [
  'review',
  'thread',
  'reply',
  'profile',
  'product',
  'ingredient',
])

export const reportStatusEnum = pgEnum('report_status', ['open', 'resolved', 'dismissed'])

export const contentReports = pgTable(
  'content_reports',
  {
    id: uuid('id').primaryKey().default(sql`uuidv7()`),
    reporterId: uuid('reporter_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    targetType: reportTargetTypeEnum('target_type').notNull(),
    targetId: uuid('target_id').notNull(),
    reason: text('reason').notNull(),
    status: reportStatusEnum('status').notNull().default('open'),
    reviewedBy: uuid('reviewed_by').references(() => users.id, { onDelete: 'set null' }),
    reviewedAt: timestamp('reviewed_at', { withTimezone: true, mode: 'string' }),
    // Escalation is orthogonal to status (ADR-0006 S3): a report stays open while
    // escalated, then resolves normally. escalatedBy = the moderator who handed it up.
    escalatedAt: timestamp('escalated_at', { withTimezone: true, mode: 'string' }),
    escalatedBy: uuid('escalated_by').references(() => users.id, { onDelete: 'set null' }),
    createdAt: timestamp('created_at', { withTimezone: true, mode: 'string' })
      .notNull()
      .defaultNow(),
  },
  (t) => [
    index('content_reports_status_idx').on(t.status),
    index('content_reports_reporter_idx').on(t.reporterId),
    index('content_reports_target_idx').on(t.targetType, t.targetId),
    index('content_reports_escalated_idx').on(t.escalatedAt).where(sql`escalated_at IS NOT NULL`),
    ...tenantPolicies('content_reports', t.reporterId),
    // The queue is owned by the moderator (admin∨contributor). Under prod RLS the
    // base tenant policies only expose a reporter's own rows, so a contributor saw
    // an empty queue — this grants the moderation read+update surface (ADR-0006 S3).
    ...moderationPolicies('content_reports'),
  ]
).enableRLS()

export type ContentReport = typeof contentReports.$inferSelect
