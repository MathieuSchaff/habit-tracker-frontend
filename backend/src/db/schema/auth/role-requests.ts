import { sql } from 'drizzle-orm'
import { index, pgEnum, pgTable, text, timestamp, uniqueIndex, uuid } from 'drizzle-orm/pg-core'

import { tenantPolicies } from '../_policies'
import { timestamps } from '../_timestamps'
import { users } from './users'

export const roleRequestStatusEnum = pgEnum('role_request_status', [
  'pending',
  'approved',
  'rejected',
  'cancelled',
])

// Self-service requests to become a contributor (#16b). Only contributor is requestable
// (admin is never self-service), so there is no target-role column. tenantPolicies gives
// the owner CRUD on their own rows and admins full read/write; contributors get nothing
// here — granting the role is an account-elevation decision, admin-only.
export const roleRequests = pgTable(
  'role_requests',
  {
    id: uuid('id').primaryKey().default(sql`uuidv7()`),
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    motivation: text('motivation').notNull(),
    motivationLink: text('motivation_link'),
    status: roleRequestStatusEnum('status').notNull().default('pending'),
    rejectionReason: text('rejection_reason'),
    reviewedBy: uuid('reviewed_by').references(() => users.id, { onDelete: 'set null' }),
    reviewedAt: timestamp('reviewed_at', { withTimezone: true, mode: 'string' }),
    ...timestamps,
  },
  (t) => [
    index('role_requests_user_idx').on(t.userId),
    index('role_requests_status_idx').on(t.status),
    // One pending request per user; cancelled/rejected/approved rows never block re-submission.
    uniqueIndex('role_requests_user_pending_unique')
      .on(t.userId)
      .where(sql`${t.status} = 'pending'`),
    ...tenantPolicies('role_requests', t.userId),
  ]
).enableRLS()

export type RoleRequest = typeof roleRequests.$inferSelect
