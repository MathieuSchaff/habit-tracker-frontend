import { sql } from 'drizzle-orm'
import { check, index, pgEnum, pgTable, text, timestamp, uuid } from 'drizzle-orm/pg-core'

import { moderationColumns } from '../_moderation'
import { users } from '../auth/users'
import { ingredients } from '../ingredients/ingredients'
import { products } from '../products/products'

export const socialPostToneEnum = pgEnum('social_post_tone', ['principal', 'coup-de-gueule'])

// A Post ≈ a discussion thread without a title, anchored to ≥1 of
// {product, ingredient, concern} (vs the thread's strict product/ingredient XOR).
// No RLS: visibility is enforced at the service layer (moderation_status), like
// discussions. tone is a facet, never a separate object.
export const socialPosts = pgTable(
  'social_posts',
  {
    id: uuid('id').primaryKey().default(sql`uuidv7()`),
    // null on account deletion (soft-delete anonymization, no cascade)
    authorId: uuid('author_id').references(() => users.id, { onDelete: 'set null' }),
    tone: socialPostToneEnum('tone').notNull(),
    content: text('content').notNull(),
    // RESTRICT, like discussions: deleting an anchored entity is an explicit admin
    // decision, not a side-effect.
    productId: uuid('product_id').references(() => products.id, { onDelete: 'restrict' }),
    ingredientId: uuid('ingredient_id').references(() => ingredients.id, { onDelete: 'restrict' }),
    // Stored as the 22-term user concern (SKIN_CONCERNS), validated app-layer; the
    // clinical bucket is derived for index/feed. Not an FK (enum value, not a row).
    concernSlug: text('concern_slug'),
    ...moderationColumns,
    createdAt: timestamp('created_at', { withTimezone: true, mode: 'string' })
      .notNull()
      .defaultNow(),
  },
  (t) => [
    index('social_posts_product_idx').on(t.productId),
    index('social_posts_ingredient_idx').on(t.ingredientId),
    index('social_posts_author_idx').on(t.authorId),
    index('social_posts_concern_idx').on(t.concernSlug),
    // Nothing floats: every post anchors to at least one thing (generalizes the
    // threads' XOR). Defense-in-depth alongside the Zod refine.
    check(
      'social_posts_anchor_min1',
      sql`(${t.productId} IS NOT NULL)::int + (${t.ingredientId} IS NOT NULL)::int + (${t.concernSlug} IS NOT NULL)::int >= 1`
    ),
  ]
)

export const socialPostReplies = pgTable(
  'social_post_replies',
  {
    id: uuid('id').primaryKey().default(sql`uuidv7()`),
    postId: uuid('post_id')
      .notNull()
      .references(() => socialPosts.id, { onDelete: 'cascade' }),
    authorId: uuid('author_id').references(() => users.id, { onDelete: 'set null' }),
    content: text('content').notNull(),
    ...moderationColumns,
    createdAt: timestamp('created_at', { withTimezone: true, mode: 'string' })
      .notNull()
      .defaultNow(),
  },
  (t) => [
    index('social_post_replies_post_idx').on(t.postId),
    index('social_post_replies_author_idx').on(t.authorId),
  ]
)

export type SocialPost = typeof socialPosts.$inferSelect
export type SocialPostReply = typeof socialPostReplies.$inferSelect
