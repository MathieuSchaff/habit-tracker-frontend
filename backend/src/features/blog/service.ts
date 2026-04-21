import type {
  ArticleSearchFilters,
  CreateArticleInput,
  UpdateArticleInput,
} from '@habit-tracker/shared'

import slugify from '@sindresorhus/slugify'
import { and, asc, eq, ilike, isNotNull, type SQL, sql } from 'drizzle-orm'

import type { DB } from '../../db'
import { articles } from '../../db/schema/blog/articles'
import { isUniqueViolation } from '../../lib/helpers'
import { BlogError } from './blog-error'

export async function listArticles(db: DB, filters: ArticleSearchFilters, isAdmin = false) {
  const page = filters.page ?? 1
  const limit = Math.min(filters.limit ?? 20, 50)
  const offset = (page - 1) * limit

  const conditions: SQL[] = []

  // Non-admins always see published articles only
  const publishedOnly = isAdmin ? (filters.publishedOnly ?? true) : true
  if (publishedOnly) {
    conditions.push(isNotNull(articles.publishedAt))
  }

  if (filters.category) {
    conditions.push(eq(articles.category, filters.category))
  }

  if (filters.q) {
    conditions.push(ilike(articles.title, `%${filters.q}%`))
  }

  const where = conditions.length > 0 ? and(...conditions) : undefined

  const [items, [{ total }]] = await Promise.all([
    db
      .select({
        id: articles.id,
        title: articles.title,
        slug: articles.slug,
        excerpt: articles.excerpt,
        category: articles.category,
        coverImageUrl: articles.coverImageUrl,
        publishedAt: articles.publishedAt,
        updatedAt: articles.updatedAt,
      })
      .from(articles)
      .where(where)
      .orderBy(asc(articles.publishedAt))
      .limit(limit)
      .offset(offset),
    db.select({ total: sql<number>`cast(count(*) as integer)` }).from(articles).where(where),
  ])

  return { items, total }
}

export async function getArticleBySlug(db: DB, slug: string) {
  const [article] = await db.select().from(articles).where(eq(articles.slug, slug)).limit(1)
  if (!article) throw new BlogError('article_not_found')
  return article
}

export async function createArticle(db: DB, userId: string, input: CreateArticleInput) {
  try {
    const slug = input.slug ? slugify(input.slug) : slugify(input.title)
    const [article] = await db
      .insert(articles)
      .values({
        ...input,
        createdBy: userId,
        slug,
        publishedAt: input.publishedAt ?? null,
      })
      .returning()
    if (!article) throw new BlogError('article_creation_failed')
    return article
  } catch (e) {
    if (e instanceof BlogError) throw e
    if (isUniqueViolation(e)) throw new BlogError('slug_already_exists')
    throw e
  }
}

export async function updateArticle(db: DB, slug: string, input: UpdateArticleInput) {
  const existing = await getArticleBySlug(db, slug)
  try {
    const newSlug = input.slug ? slugify(input.slug) : undefined
    const [updated] = await db
      .update(articles)
      .set({ ...input, slug: newSlug ?? existing.slug })
      .where(eq(articles.id, existing.id))
      .returning()
    if (!updated) throw new BlogError('article_update_failed')
    return updated
  } catch (e) {
    if (e instanceof BlogError) throw e
    if (isUniqueViolation(e)) throw new BlogError('slug_already_exists')
    throw e
  }
}

export async function deleteArticle(db: DB, slug: string) {
  const existing = await getArticleBySlug(db, slug)
  try {
    await db.delete(articles).where(eq(articles.id, existing.id))
  } catch (e) {
    throw new BlogError('article_delete_failed', e)
  }
}
