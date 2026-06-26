import type {
  CreatePostInput,
  CreatePostReplyInput,
  PublicProductPostsResponse,
  PublicProfilePostsResponse,
  SkinConcern,
  SocialPostReplyView,
  SocialPostSurfaceView,
  SocialPostView,
  SocialPostWithReplies,
} from '@aurore/shared'

import { and, desc, eq, isNotNull } from 'drizzle-orm'

import type { DB } from '../../db'
import { profiles } from '../../db/schema/auth/users'
import { ingredients } from '../../db/schema/ingredients/ingredients'
import { products } from '../../db/schema/products/products'
import { socialPostReplies, socialPosts } from '../../db/schema/social/posts'
import { SocialPostError } from './social-post-error'

type PostRow = typeof socialPosts.$inferSelect

function toPostView(post: PostRow, authorName: string | null): SocialPostView {
  return {
    id: post.id,
    authorId: post.authorId,
    authorName,
    tone: post.tone,
    content: post.content,
    productId: post.productId,
    ingredientId: post.ingredientId,
    // Always a SKIN_CONCERNS value — Zod-validated on write, stored as text.
    concernSlug: post.concernSlug as SkinConcern | null,
    createdAt: post.createdAt,
  }
}

async function usernameOf(userId: string, db: DB): Promise<string | null> {
  const [row] = await db
    .select({ username: profiles.username })
    .from(profiles)
    .where(eq(profiles.userId, userId))
  return row?.username ?? null
}

// FK-anchored entities must exist (the CHECK only enforces ≥1 anchor present, not
// that it points at a real row). Concern is enum-validated by Zod, no FK.
async function assertAnchorsExist(input: CreatePostInput, db: DB): Promise<void> {
  if (input.productId) {
    const [p] = await db
      .select({ id: products.id })
      .from(products)
      .where(eq(products.id, input.productId))
    if (!p) throw new SocialPostError('anchor_not_found')
  }
  if (input.ingredientId) {
    const [i] = await db
      .select({ id: ingredients.id })
      .from(ingredients)
      .where(eq(ingredients.id, input.ingredientId))
    if (!i) throw new SocialPostError('anchor_not_found')
  }
}

export async function createPost(
  userId: string,
  input: CreatePostInput,
  db: DB
): Promise<SocialPostView> {
  await assertAnchorsExist(input, db)

  const [post] = await db
    .insert(socialPosts)
    .values({
      authorId: userId,
      tone: input.tone,
      content: input.content,
      productId: input.productId ?? null,
      ingredientId: input.ingredientId ?? null,
      concernSlug: input.concernSlug ?? null,
    })
    .returning()

  if (!post) throw new SocialPostError('post_creation_failed')
  return toPostView(post, await usernameOf(userId, db))
}

export async function getPostWithReplies(postId: string, db: DB): Promise<SocialPostWithReplies> {
  const [post] = await db
    .select({
      id: socialPosts.id,
      authorId: socialPosts.authorId,
      authorName: profiles.username,
      tone: socialPosts.tone,
      content: socialPosts.content,
      productId: socialPosts.productId,
      ingredientId: socialPosts.ingredientId,
      concernSlug: socialPosts.concernSlug,
      createdAt: socialPosts.createdAt,
    })
    .from(socialPosts)
    .leftJoin(profiles, eq(socialPosts.authorId, profiles.userId))
    .where(and(eq(socialPosts.id, postId), eq(socialPosts.moderationStatus, 'visible')))

  if (!post) throw new SocialPostError('post_not_found')

  const replies = await db
    .select({
      id: socialPostReplies.id,
      postId: socialPostReplies.postId,
      authorId: socialPostReplies.authorId,
      authorName: profiles.username,
      content: socialPostReplies.content,
      createdAt: socialPostReplies.createdAt,
    })
    .from(socialPostReplies)
    .leftJoin(profiles, eq(socialPostReplies.authorId, profiles.userId))
    .where(
      and(eq(socialPostReplies.postId, postId), eq(socialPostReplies.moderationStatus, 'visible'))
    )
    .orderBy(socialPostReplies.createdAt)

  return {
    ...post,
    concernSlug: post.concernSlug as SkinConcern | null,
    replyCount: replies.length,
    replies,
  }
}

export async function deletePost(userId: string, postId: string, db: DB): Promise<void> {
  // Owner filter in the WHERE, not a post-fetch 403: a missing post and another
  // user's post both delete zero rows → uniform post_not_found (anti-enumeration).
  const deleted = await db
    .delete(socialPosts)
    .where(and(eq(socialPosts.id, postId), eq(socialPosts.authorId, userId)))
    .returning({ id: socialPosts.id })

  if (deleted.length === 0) throw new SocialPostError('post_not_found')
}

export async function createPostReply(
  userId: string,
  postId: string,
  input: CreatePostReplyInput,
  db: DB
): Promise<SocialPostReplyView> {
  // Reject replies on hidden/missing posts: the insert would succeed but pollute
  // the DB with rows on a moderated post.
  const [post] = await db
    .select({ id: socialPosts.id })
    .from(socialPosts)
    .where(and(eq(socialPosts.id, postId), eq(socialPosts.moderationStatus, 'visible')))

  if (!post) throw new SocialPostError('post_not_found')

  const [reply] = await db
    .insert(socialPostReplies)
    .values({ postId, authorId: userId, content: input.content })
    .returning()

  if (!reply) throw new SocialPostError('reply_creation_failed')

  return {
    id: reply.id,
    postId: reply.postId,
    authorId: reply.authorId,
    authorName: await usernameOf(userId, db),
    content: reply.content,
    createdAt: reply.createdAt,
  }
}

export async function deletePostReply(userId: string, replyId: string, db: DB): Promise<void> {
  const deleted = await db
    .delete(socialPostReplies)
    .where(and(eq(socialPostReplies.id, replyId), eq(socialPostReplies.authorId, userId)))
    .returning({ id: socialPostReplies.id })

  if (deleted.length === 0) throw new SocialPostError('reply_not_found')
}

export type SurfaceRow = {
  id: string
  content: string
  tone: SocialPostSurfaceView['tone']
  concernSlug: string | null
  createdAt: string
  authorUsername: string | null
  authorProfilePublic: boolean
  productSlug: string | null
  productName: string | null
  ingredientSlug: string | null
  ingredientName: string | null
}

export function toSurfaceView(row: SurfaceRow): SocialPostSurfaceView {
  return {
    id: row.id,
    content: row.content,
    tone: row.tone,
    concernSlug: row.concernSlug as SkinConcern | null,
    productAnchor:
      row.productSlug && row.productName ? { slug: row.productSlug, name: row.productName } : null,
    ingredientAnchor:
      row.ingredientSlug && row.ingredientName
        ? { slug: row.ingredientSlug, name: row.ingredientName }
        : null,
    createdAt: row.createdAt,
    author: { username: row.authorUsername as string, profilePublic: row.authorProfilePublic },
  }
}

export const surfaceColumns = {
  id: socialPosts.id,
  content: socialPosts.content,
  tone: socialPosts.tone,
  concernSlug: socialPosts.concernSlug,
  createdAt: socialPosts.createdAt,
  authorUsername: profiles.username,
  authorProfilePublic: profiles.profilePublic,
  productSlug: products.slug,
  productName: products.name,
  ingredientSlug: ingredients.slug,
  ingredientName: ingredients.name,
} as const

const PROFILE_POSTS_SAMPLE_CAP = 12

// Profile-surface mirror of listPublicReviewsByUser: a recent capped sample of an
// author's visible posts, master-gated (profilePublic + not force-privated; RLS
// doesn't gate this surface so the service is the primary gate). Anchors resolved
// to displayable refs. Anti-enum: unknown/non-public username -> empty list.
export async function listPostsByAuthor(
  db: DB,
  username: string
): Promise<PublicProfilePostsResponse> {
  const rows = await db
    .select(surfaceColumns)
    .from(socialPosts)
    .innerJoin(profiles, eq(profiles.userId, socialPosts.authorId))
    .leftJoin(products, eq(products.id, socialPosts.productId))
    .leftJoin(ingredients, eq(ingredients.id, socialPosts.ingredientId))
    .where(
      and(
        eq(socialPosts.moderationStatus, 'visible'),
        eq(profiles.username, username),
        isNotNull(profiles.username),
        eq(profiles.profilePublic, true),
        eq(profiles.forcedPrivateByAdmin, false)
      )
    )
    .orderBy(desc(socialPosts.createdAt))
    .limit(PROFILE_POSTS_SAMPLE_CAP)

  return { posts: rows.map(toSurfaceView) }
}

const PRODUCT_POSTS_SAMPLE_CAP = 50

// Product-surface mirror of listPublicReviewsForProduct: visible posts anchored to
// the product, newest first. Unlike the profile surface this does NOT master-gate
// on profilePublic — a non-public author's post still shows, the /u link is gated
// client-side (ReviewerName pattern). Force-privated authors are excluded.
export async function listPostsForProduct(
  db: DB,
  slug: string
): Promise<PublicProductPostsResponse> {
  const rows = await db
    .select(surfaceColumns)
    .from(socialPosts)
    .innerJoin(profiles, eq(profiles.userId, socialPosts.authorId))
    // leftJoin + slug filter narrows to posts whose product anchor has this slug;
    // concern/ingredient-only posts (null productId) drop out, as intended.
    .leftJoin(products, eq(products.id, socialPosts.productId))
    .leftJoin(ingredients, eq(ingredients.id, socialPosts.ingredientId))
    .where(
      and(
        eq(socialPosts.moderationStatus, 'visible'),
        eq(products.slug, slug),
        // Mirror listPublicReviewsForProduct: an author who never set a username
        // must not surface (author.username is non-null on the wire).
        isNotNull(profiles.username),
        eq(profiles.forcedPrivateByAdmin, false)
      )
    )
    .orderBy(desc(socialPosts.createdAt))
    .limit(PRODUCT_POSTS_SAMPLE_CAP)

  return { posts: rows.map(toSurfaceView) }
}
