import {
  concernsSharingBucket,
  type FeedQuery,
  type SocialFeedItemView,
  type SocialFeedResponse,
} from '@aurore/shared'

import { and, desc, eq, inArray, isNotNull } from 'drizzle-orm'

import type { DB } from '../../db'
import { profiles } from '../../db/schema/auth/users'
import { ingredients } from '../../db/schema/ingredients/ingredients'
import { products } from '../../db/schema/products/products'
import { socialPosts } from '../../db/schema/social/posts'
import { surfaceColumns, toSurfaceView } from './posts.service'
import { rankSimilarProfiles } from './service'

// A bounded recent window: the feed reads the newest visible posts from the
// cohort, then (for similarity order) re-groups them by closeness. Caps the
// query regardless of order so a prolific cohort can't unbound the response.
const FEED_CAP = 60

// The capstone read (#36): deliberate Posts from the viewer's similar cohort.
// Source = rankSimilarProfiles (same discoverable-gated, RLS-covered cohort as
// "people like me"), so the feed never widens visibility beyond the opt-in set.
// Filtered by tone (one at a time) and optional concern (bucket-expanded), ordered
// by recency or similarity — never by reactions (#3). No activity firehose (#15).
export async function feed(
  db: DB,
  viewerUserId: string,
  { tone, concern, order }: FeedQuery
): Promise<SocialFeedResponse> {
  const cohort = await rankSimilarProfiles(db, viewerUserId)
  if (cohort.length === 0) return { posts: [] }

  // Band + cohort rank by author. Rank is the score-sorted position (the engine
  // already ordered the cohort), so similarity order never re-exposes the score.
  const bandByUsername = new Map(cohort.map((c) => [c.username, c.band]))
  const rankByUsername = new Map(cohort.map((c, i) => [c.username, i]))

  const filters = [
    eq(socialPosts.moderationStatus, 'visible'),
    inArray(
      profiles.username,
      cohort.map((c) => c.username)
    ),
    eq(socialPosts.tone, tone),
    isNotNull(profiles.username),
    eq(profiles.forcedPrivateByAdmin, false),
  ]
  if (concern) {
    filters.push(inArray(socialPosts.concernSlug, concernsSharingBucket(concern)))
  }

  const rows = await db
    .select(surfaceColumns)
    .from(socialPosts)
    .innerJoin(profiles, eq(profiles.userId, socialPosts.authorId))
    .leftJoin(products, eq(products.id, socialPosts.productId))
    .leftJoin(ingredients, eq(ingredients.id, socialPosts.ingredientId))
    .where(and(...filters))
    .orderBy(desc(socialPosts.createdAt))
    .limit(FEED_CAP)

  const items: SocialFeedItemView[] = rows.map((row) => ({
    ...toSurfaceView(row),
    // Non-null: the author is a cohort member, so the band is always present.
    authorBand: bandByUsername.get(row.authorUsername as string) ?? 'eloigne',
  }))

  if (order === 'similarity') {
    // Stable sort by cohort rank keeps the createdAt-desc input order within an
    // author, so similarity order = closest authors first, newest-first within each.
    items.sort(
      (a, b) =>
        (rankByUsername.get(a.author.username) ?? 0) - (rankByUsername.get(b.author.username) ?? 0)
    )
  }

  return { posts: items }
}
