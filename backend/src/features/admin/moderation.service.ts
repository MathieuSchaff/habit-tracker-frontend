import type {
  ContentPreviewResult,
  ModerateContentInput,
  ModerateContentResult,
  ModerateProfileInput,
  ModerateProfileResult,
} from '@habit-tracker/shared'

import { eq } from 'drizzle-orm'

import type { Database } from '../../db'
import { discussionReplies, discussionThreads, userProductReviews } from '../../db/schema'
import { profiles } from '../../db/schema/auth/users'
import { userProducts } from '../../db/schema/products/user-products'
import { nowISO } from '../../utils/dates'

type ModerateArgs = {
  id: string
  adminId: string
  body: ModerateContentInput
}

function buildUpdates(args: ModerateArgs) {
  return {
    moderationStatus: args.body.status,
    moderatedBy: args.adminId,
    moderatedAt: nowISO(),
    moderationReason: args.body.reason ?? null,
  }
}

export async function moderateReview(
  db: Database,
  args: ModerateArgs
): Promise<ModerateContentResult> {
  const [row] = await db
    .update(userProductReviews)
    .set(buildUpdates(args))
    .where(eq(userProductReviews.id, args.id))
    .returning({
      id: userProductReviews.id,
      moderationStatus: userProductReviews.moderationStatus,
      moderationReason: userProductReviews.moderationReason,
    })
  if (!row) return { success: false, error: 'not_found' }
  return { success: true, data: row }
}

export async function moderateThread(
  db: Database,
  args: ModerateArgs
): Promise<ModerateContentResult> {
  const [row] = await db
    .update(discussionThreads)
    .set(buildUpdates(args))
    .where(eq(discussionThreads.id, args.id))
    .returning({
      id: discussionThreads.id,
      moderationStatus: discussionThreads.moderationStatus,
      moderationReason: discussionThreads.moderationReason,
    })
  if (!row) return { success: false, error: 'not_found' }
  return { success: true, data: row }
}

export async function moderateReply(
  db: Database,
  args: ModerateArgs
): Promise<ModerateContentResult> {
  const [row] = await db
    .update(discussionReplies)
    .set(buildUpdates(args))
    .where(eq(discussionReplies.id, args.id))
    .returning({
      id: discussionReplies.id,
      moderationStatus: discussionReplies.moderationStatus,
      moderationReason: discussionReplies.moderationReason,
    })
  if (!row) return { success: false, error: 'not_found' }
  return { success: true, data: row }
}

type ModerateProfileArgs = {
  targetUserId: string
  adminId: string
  body: ModerateProfileInput
}

export async function previewReview(db: Database, id: string): Promise<ContentPreviewResult> {
  const [row] = await db
    .select({
      id: userProductReviews.id,
      comment: userProductReviews.comment,
      moderationStatus: userProductReviews.moderationStatus,
      moderationReason: userProductReviews.moderationReason,
      createdAt: userProductReviews.createdAt,
      authorId: userProducts.userId,
      authorUsername: profiles.username,
    })
    .from(userProductReviews)
    .leftJoin(userProducts, eq(userProducts.id, userProductReviews.userProductId))
    .leftJoin(profiles, eq(profiles.userId, userProducts.userId))
    .where(eq(userProductReviews.id, id))
    .limit(1)
  if (!row) return { success: false, error: 'not_found' }
  return { success: true, data: { kind: 'review', ...row } }
}

export async function previewThread(db: Database, id: string): Promise<ContentPreviewResult> {
  const [row] = await db
    .select({
      id: discussionThreads.id,
      title: discussionThreads.title,
      content: discussionThreads.content,
      moderationStatus: discussionThreads.moderationStatus,
      moderationReason: discussionThreads.moderationReason,
      createdAt: discussionThreads.createdAt,
      authorId: discussionThreads.authorId,
      authorUsername: profiles.username,
    })
    .from(discussionThreads)
    .leftJoin(profiles, eq(profiles.userId, discussionThreads.authorId))
    .where(eq(discussionThreads.id, id))
    .limit(1)
  if (!row) return { success: false, error: 'not_found' }
  return { success: true, data: { kind: 'thread', ...row } }
}

export async function previewReply(db: Database, id: string): Promise<ContentPreviewResult> {
  const [row] = await db
    .select({
      id: discussionReplies.id,
      content: discussionReplies.content,
      moderationStatus: discussionReplies.moderationStatus,
      moderationReason: discussionReplies.moderationReason,
      createdAt: discussionReplies.createdAt,
      authorId: discussionReplies.authorId,
      authorUsername: profiles.username,
    })
    .from(discussionReplies)
    .leftJoin(profiles, eq(profiles.userId, discussionReplies.authorId))
    .where(eq(discussionReplies.id, id))
    .limit(1)
  if (!row) return { success: false, error: 'not_found' }
  return { success: true, data: { kind: 'reply', ...row } }
}

export async function moderateProfileVisibility(
  db: Database,
  args: ModerateProfileArgs
): Promise<ModerateProfileResult> {
  const updates = args.body.forcedPrivate
    ? {
        forcedPrivateByAdmin: true,
        forcedPrivateBy: args.adminId,
        forcedPrivateAt: nowISO(),
        forcedPrivateReason: args.body.reason ?? null,
      }
    : {
        forcedPrivateByAdmin: false,
        forcedPrivateBy: null,
        forcedPrivateAt: null,
        forcedPrivateReason: null,
      }

  const [row] = await db
    .update(profiles)
    .set(updates)
    .where(eq(profiles.userId, args.targetUserId))
    .returning({
      userId: profiles.userId,
      forcedPrivateByAdmin: profiles.forcedPrivateByAdmin,
      forcedPrivateReason: profiles.forcedPrivateReason,
    })
  if (!row) return { success: false, error: 'not_found' }
  return { success: true, data: row }
}
