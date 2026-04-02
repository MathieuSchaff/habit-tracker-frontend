import type { CreateReplyInput, CreateThreadInput } from '@habit-tracker/shared'

import { count, desc, eq } from 'drizzle-orm'

import type { DB } from '../../db'
import { db } from '../../db'
import { discussionReplies, discussionThreads } from '../../db/schema/discussions'
import { ingredients } from '../../db/schema/ingredients'
import { products } from '../../db/schema/products'
import { profiles } from '../../db/schema/users'
import { DiscussionError } from './discussion-error'

export type EntityType = 'product' | 'ingredient'

async function resolveEntityId(
  slug: string,
  entityType: EntityType,
  database: DB
): Promise<string> {
  if (entityType === 'product') {
    const [row] = await database
      .select({ id: products.id })
      .from(products)
      .where(eq(products.slug, slug))
    if (!row) throw new DiscussionError('entity_not_found')
    return row.id
  }
  const [row] = await database
    .select({ id: ingredients.id })
    .from(ingredients)
    .where(eq(ingredients.slug, slug))
  if (!row) throw new DiscussionError('entity_not_found')
  return row.id
}

export async function listThreads(slug: string, entityType: EntityType, database: DB = db) {
  const entityId = await resolveEntityId(slug, entityType, database)
  const condition =
    entityType === 'product'
      ? eq(discussionThreads.productId, entityId)
      : eq(discussionThreads.ingredientId, entityId)

  return database
    .select({
      id: discussionThreads.id,
      productId: discussionThreads.productId,
      ingredientId: discussionThreads.ingredientId,
      authorId: discussionThreads.authorId,
      authorName: profiles.username,
      title: discussionThreads.title,
      content: discussionThreads.content,
      replyCount: count(discussionReplies.id),
      createdAt: discussionThreads.createdAt,
    })
    .from(discussionThreads)
    .leftJoin(profiles, eq(discussionThreads.authorId, profiles.userId))
    .leftJoin(discussionReplies, eq(discussionReplies.threadId, discussionThreads.id))
    .where(condition)
    .groupBy(discussionThreads.id, profiles.username)
    .orderBy(desc(discussionThreads.createdAt))
}

export async function createThread(
  userId: string,
  slug: string,
  entityType: EntityType,
  input: CreateThreadInput,
  database: DB = db
) {
  const entityId = await resolveEntityId(slug, entityType, database)
  const entityFields =
    entityType === 'product'
      ? { productId: entityId, ingredientId: null }
      : { productId: null, ingredientId: entityId }

  const [thread] = await database
    .insert(discussionThreads)
    .values({ ...entityFields, authorId: userId, title: input.title, content: input.content })
    .returning()

  if (!thread) throw new DiscussionError('thread_creation_failed')
  return thread
}

export async function getThreadWithReplies(threadId: string, database: DB = db) {
  const [thread] = await database
    .select({
      id: discussionThreads.id,
      productId: discussionThreads.productId,
      ingredientId: discussionThreads.ingredientId,
      authorId: discussionThreads.authorId,
      authorName: profiles.username,
      title: discussionThreads.title,
      content: discussionThreads.content,
      createdAt: discussionThreads.createdAt,
    })
    .from(discussionThreads)
    .leftJoin(profiles, eq(discussionThreads.authorId, profiles.userId))
    .where(eq(discussionThreads.id, threadId))

  if (!thread) throw new DiscussionError('thread_not_found')

  const replies = await database
    .select({
      id: discussionReplies.id,
      threadId: discussionReplies.threadId,
      authorId: discussionReplies.authorId,
      authorName: profiles.username,
      content: discussionReplies.content,
      createdAt: discussionReplies.createdAt,
    })
    .from(discussionReplies)
    .leftJoin(profiles, eq(discussionReplies.authorId, profiles.userId))
    .where(eq(discussionReplies.threadId, threadId))
    .orderBy(discussionReplies.createdAt)

  return { ...thread, replyCount: replies.length, replies }
}

export async function deleteThread(userId: string, threadId: string, database: DB = db) {
  const [thread] = await database
    .select({ authorId: discussionThreads.authorId })
    .from(discussionThreads)
    .where(eq(discussionThreads.id, threadId))

  if (!thread) throw new DiscussionError('thread_not_found')
  if (thread.authorId !== userId) throw new DiscussionError('unauthorized_access')

  await database.delete(discussionThreads).where(eq(discussionThreads.id, threadId))
}

export async function createReply(
  userId: string,
  threadId: string,
  input: CreateReplyInput,
  database: DB = db
) {
  const [thread] = await database
    .select({ id: discussionThreads.id })
    .from(discussionThreads)
    .where(eq(discussionThreads.id, threadId))

  if (!thread) throw new DiscussionError('thread_not_found')

  const [reply] = await database
    .insert(discussionReplies)
    .values({ threadId, authorId: userId, content: input.content })
    .returning()

  if (!reply) throw new DiscussionError('reply_creation_failed')
  return reply
}

export async function deleteReply(userId: string, replyId: string, database: DB = db) {
  const [reply] = await database
    .select({ authorId: discussionReplies.authorId })
    .from(discussionReplies)
    .where(eq(discussionReplies.id, replyId))

  if (!reply) throw new DiscussionError('reply_not_found')
  if (reply.authorId !== userId) throw new DiscussionError('unauthorized_access')

  await database.delete(discussionReplies).where(eq(discussionReplies.id, replyId))
}
