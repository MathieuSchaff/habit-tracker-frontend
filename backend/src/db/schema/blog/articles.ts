import { BLOG_CATEGORY_VALUES } from '@habit-tracker/shared'

import { sql } from 'drizzle-orm'
import { index, pgEnum, pgTable, text, timestamp, uniqueIndex, uuid } from 'drizzle-orm/pg-core'

import { users } from '../auth/users'

export const blogCategoryEnum = pgEnum('blog_category', BLOG_CATEGORY_VALUES)

export const articles = pgTable(
  'articles',
  {
    id: uuid('id').primaryKey().default(sql`uuidv7()`),
    createdBy: uuid('created_by')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    title: text('title').notNull(),
    slug: text('slug').notNull(),
    excerpt: text('excerpt'),
    content: text('content').notNull().default(''),
    category: blogCategoryEnum('category').notNull(),
    coverImageUrl: text('cover_image_url'),
    // null = brouillon, sinon date de publication
    publishedAt: timestamp('published_at', { withTimezone: true }),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true })
      .notNull()
      .defaultNow()
      .$onUpdate(() => new Date()),
  },
  (t) => [
    uniqueIndex('articles_slug_unique').on(t.slug),
    index('articles_category_idx').on(t.category),
    index('articles_published_at_idx').on(t.publishedAt),
    index('articles_created_by_idx').on(t.createdBy),
  ]
)

export type Article = typeof articles.$inferSelect
