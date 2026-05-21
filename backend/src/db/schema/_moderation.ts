import { pgEnum, text, timestamp, uuid } from 'drizzle-orm/pg-core'

import { users } from './auth/users'

// 'visible' = default state, the row is shown on public reads.
// 'hidden' = admin-removed, the row stays in DB (audit trail + restoration)
// but is filtered out from any public read.
export const moderationStatusEnum = pgEnum('moderation_status', ['visible', 'hidden'])

// Spread into a table definition to opt that table into admin moderation.
// All user-generated, public-readable surfaces should adopt this.
export const moderationColumns = {
  moderationStatus: moderationStatusEnum('moderation_status').notNull().default('visible'),
  moderatedBy: uuid('moderated_by').references(() => users.id, { onDelete: 'set null' }),
  moderatedAt: timestamp('moderated_at', { withTimezone: true, mode: 'string' }),
  moderationReason: text('moderation_reason'),
}
