import { pgEnum, text, timestamp, uuid } from 'drizzle-orm/pg-core'

import { users } from './auth/users'

// 'hidden' = soft-delete: row stays in DB for audit trail + restoration.
export const moderationStatusEnum = pgEnum('moderation_status', ['visible', 'hidden'])

// Spread into any user-generated, public-readable table to opt into admin moderation.
export const moderationColumns = {
  moderationStatus: moderationStatusEnum('moderation_status').notNull().default('visible'),
  moderatedBy: uuid('moderated_by').references(() => users.id, { onDelete: 'set null' }),
  moderatedAt: timestamp('moderated_at', { withTimezone: true, mode: 'string' }),
  moderationReason: text('moderation_reason'),
}
