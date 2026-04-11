import { sql } from 'drizzle-orm'
import { check, index, pgTable, text, timestamp, uuid } from 'drizzle-orm/pg-core'

import { users } from '../auth/users'
import { ingredients } from '../ingredients/ingredients'
import { products } from './products'

export const discussionThreads = pgTable(
  'discussion_threads',
  {
    id: uuid('id').primaryKey().default(sql`uuidv7()`),
    productId: uuid('product_id').references(() => products.id, { onDelete: 'cascade' }),
    ingredientId: uuid('ingredient_id').references(() => ingredients.id, { onDelete: 'cascade' }),
    // null when account is deleted (soft-delete anonymization, no cascade)
    authorId: uuid('author_id').references(() => users.id, { onDelete: 'set null' }),
    title: text('title').notNull(),
    content: text('content').notNull(),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    index('discussion_threads_product_idx').on(t.productId),
    index('discussion_threads_ingredient_idx').on(t.ingredientId),
    index('discussion_threads_author_idx').on(t.authorId),
    // exactly one entity must be set
    check(
      'discussion_threads_entity_xor',
      sql`(${t.productId} IS NOT NULL)::int + (${t.ingredientId} IS NOT NULL)::int = 1`
    ),
  ]
)

export const discussionReplies = pgTable(
  'discussion_replies',
  {
    id: uuid('id').primaryKey().default(sql`uuidv7()`),
    threadId: uuid('thread_id')
      .notNull()
      .references(() => discussionThreads.id, { onDelete: 'cascade' }),
    // null when account is deleted (soft-delete anonymization)
    authorId: uuid('author_id').references(() => users.id, { onDelete: 'set null' }),
    content: text('content').notNull(),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    index('discussion_replies_thread_idx').on(t.threadId),
    index('discussion_replies_author_idx').on(t.authorId),
  ]
)

export type DiscussionThread = typeof discussionThreads.$inferSelect
export type DiscussionReply = typeof discussionReplies.$inferSelect
