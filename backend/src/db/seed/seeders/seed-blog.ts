import slugify from '@sindresorhus/slugify'
import { sql } from 'drizzle-orm'

import { db } from '../..'
import { articles } from '../../schema'
import { articleData } from '../data/blog'
import { seedBatch } from '../utils/batch'
import { getOrCreateSeedUser } from './create-user'

// Upsert: insert new articles, update publishedAt on existing drafts (published_at IS NULL).
export async function seedBlog(_idempotent = false) {
  console.log('\n📝 Seed des articles de blog...')

  const user = await getOrCreateSeedUser()

  const result = await seedBatch(
    'articles',
    articleData,
    (article) => {
      const slug = article.slug ? slugify(article.slug) : slugify(article.title)
      return db
        .insert(articles)
        .values({
          ...article,
          slug,
          createdBy: user.id,
          publishedAt: article.publishedAt ?? null,
        })
        .onConflictDoUpdate({
          target: articles.slug,
          set: {
            title: sql`EXCLUDED.title`,
            excerpt: sql`EXCLUDED.excerpt`,
            content: sql`EXCLUDED.content`,
            category: sql`EXCLUDED.category`,
            coverImageUrl: sql`EXCLUDED.cover_image_url`,
            publishedAt: sql`EXCLUDED.published_at`,
            updatedAt: sql`now()`,
          },
        })
    },
    (article) => article.slug ?? article.title,
    false
  )

  console.log(`✅ ${result.success}/${result.total} articles insérés/mis à jour`)
  if (result.failed.length > 0) {
    console.warn(`⚠️  ${result.failed.length} article(s) en échec :`)
    for (const f of result.failed) console.warn(`   - ${f.item}: ${f.reason}`)
  }
}

if (import.meta.main || process.argv[1]?.endsWith('seed-blog.ts')) {
  seedBlog().catch((err) => {
    console.error('💥 Erreur seed blog :', err instanceof Error ? err.message : err)
    process.exit(1)
  })
}
