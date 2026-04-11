import { z } from 'zod'

import { HTTP_STATUS, type HttpStatus } from '../core'

// SCHEMAS

const uuid = z.uuid()

export const createThreadSchema = z.object({
  title: z.string().min(1).max(120),
  content: z.string().min(1),
})

export const createReplySchema = z.object({
  content: z.string().min(1),
})

export const replyResponseSchema = z.object({
  id: uuid,
  threadId: uuid,
  authorId: uuid.nullable(),
  authorName: z.string().nullable(),
  content: z.string(),
  createdAt: z.date(),
})

export const threadResponseSchema = z.object({
  id: uuid,
  productId: uuid.nullable(),
  ingredientId: uuid.nullable(),
  authorId: uuid.nullable(),
  authorName: z.string().nullable(),
  title: z.string(),
  content: z.string(),
  replyCount: z.number().int(),
  createdAt: z.date(),
})

export const threadWithRepliesResponseSchema = threadResponseSchema.extend({
  replies: z.array(replyResponseSchema),
})

// TYPES

export type CreateThreadInput = z.infer<typeof createThreadSchema>
export type CreateReplyInput = z.infer<typeof createReplySchema>

export type DiscussionThread = {
  id: string
  productId: string | null
  ingredientId: string | null
  authorId: string | null
  authorName: string | null
  title: string
  content: string
  replyCount: number
  createdAt: string | Date
}

export type DiscussionReply = {
  id: string
  threadId: string
  authorId: string | null
  authorName: string | null
  content: string
  createdAt: string | Date
}

export type DiscussionThreadWithReplies = DiscussionThread & {
  replies: DiscussionReply[]
}

export type DiscussionErrorCode =
  | 'thread_not_found'
  | 'reply_not_found'
  | 'unauthorized_access'
  | 'thread_creation_failed'
  | 'reply_creation_failed'
  | 'entity_not_found'

// HELPERS

export const discussionErrorMapping = {
  thread_not_found: HTTP_STATUS.NOT_FOUND,
  reply_not_found: HTTP_STATUS.NOT_FOUND,
  unauthorized_access: HTTP_STATUS.FORBIDDEN,
  thread_creation_failed: HTTP_STATUS.INTERNAL_SERVER_ERROR,
  reply_creation_failed: HTTP_STATUS.INTERNAL_SERVER_ERROR,
  entity_not_found: HTTP_STATUS.NOT_FOUND,
} as const satisfies Record<DiscussionErrorCode, HttpStatus>
