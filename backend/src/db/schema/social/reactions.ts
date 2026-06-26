import { sql } from 'drizzle-orm'
import { index, pgEnum, pgTable, timestamp, unique, uuid } from 'drizzle-orm/pg-core'

import { users } from '../auth/users'

// Polymorphic over four conversation surfaces; reviews are deliberately absent
// (ADR-0013: a Review is a deposit leaf, not a Reactable).
export const reactableTypeEnum = pgEnum('reactable_type', [
  'post',
  'thread',
  'post_reply',
  'thread_reply',
])

// Small, fixed entraide set — gratitude / recognition / encouragement, never an
// evaluative vote (ADR-0013). FR values, mirroring social_post_tone.
export const reactionKindEnum = pgEnum('reaction_kind', ['merci', 'moi-aussi', 'soutien'])

// No counter column exists by design: a total is unrepresentable without a schema
// change that would itself flag the doctrine crossing (ADR-0013).
export const socialReactions = pgTable(
  'social_reactions',
  {
    id: uuid('id').primaryKey().default(sql`uuidv7()`),
    reactableType: reactableTypeEnum('reactable_type').notNull(),
    // No FK: the target is polymorphic. Existence + visibility are enforced
    // app-layer per type (ADR-0013), mirroring assertAnchorsExist.
    reactableId: uuid('reactable_id').notNull(),
    // null only on account deletion (soft-delete anonymization); live reactions
    // are always signed.
    userId: uuid('user_id').references(() => users.id, { onDelete: 'set null' }),
    kind: reactionKindEnum('kind').notNull(),
    createdAt: timestamp('created_at', { withTimezone: true, mode: 'string' })
      .notNull()
      .defaultNow(),
  },
  (t) => [
    index('social_reactions_target_idx').on(t.reactableType, t.reactableId),
    index('social_reactions_user_idx').on(t.userId),
    // One reaction per (target, person, kind): toggling is idempotent, never a tally.
    unique('social_reactions_unique').on(t.reactableType, t.reactableId, t.userId, t.kind),
  ]
)

export type SocialReaction = typeof socialReactions.$inferSelect
