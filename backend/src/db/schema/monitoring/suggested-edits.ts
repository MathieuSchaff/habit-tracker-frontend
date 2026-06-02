import { sql } from 'drizzle-orm'
import { index, pgEnum, pgTable, text, timestamp, uuid } from 'drizzle-orm/pg-core'

import { moderationPolicies, tenantPolicies } from '../_policies'
import { users } from '../auth/users'

export const editTargetTypeEnum = pgEnum('edit_target_type', ['product', 'ingredient'])

export const suggestedEditStatusEnum = pgEnum('suggested_edit_status', [
  'pending',
  'accepted',
  'rejected',
])

export const suggestedEdits = pgTable(
  'suggested_edits',
  {
    id: uuid('id').primaryKey().default(sql`uuidv7()`),
    proposerId: uuid('proposer_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    // Polymorphic target: no FK; concrete sheet resolved at review time.
    targetType: editTargetTypeEnum('target_type').notNull(),
    targetId: uuid('target_id').notNull(),
    field: text('field').notNull(),
    proposedValue: text('proposed_value').notNull(),
    status: suggestedEditStatusEnum('status').notNull().default('pending'),
    reviewedBy: uuid('reviewed_by').references(() => users.id, { onDelete: 'set null' }),
    reviewedAt: timestamp('reviewed_at', { withTimezone: true, mode: 'string' }),
    createdAt: timestamp('created_at', { withTimezone: true, mode: 'string' })
      .notNull()
      .defaultNow(),
  },
  (t) => [
    index('suggested_edits_status_idx').on(t.status),
    index('suggested_edits_proposer_idx').on(t.proposerId),
    index('suggested_edits_target_idx').on(t.targetType, t.targetId),
    ...tenantPolicies('suggested_edits', t.proposerId),
    ...moderationPolicies('suggested_edits'),
  ]
).enableRLS()

export type SuggestedEdit = typeof suggestedEdits.$inferSelect
