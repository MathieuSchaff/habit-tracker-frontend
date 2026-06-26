import { z } from 'zod'

import { HTTP_STATUS, type HttpStatus } from '../core'
import { SKIN_CONCERNS, type SkinConcern } from '../profile'

// A Post has no title (read inline); the tone is a facet, not an object.
export const POST_TONES = ['principal', 'coup-de-gueule'] as const
export type PostTone = (typeof POST_TONES)[number]

// Anchors are optional individually but at least one is required (#24: rien ne
// flotte). The concern is a picked 22-term user concern, never free text.
export const createPostSchema = z
  .object({
    content: z.string().min(1).max(2000),
    tone: z.enum(POST_TONES),
    productId: z.uuid().optional(),
    ingredientId: z.uuid().optional(),
    concernSlug: z.enum(SKIN_CONCERNS).optional(),
  })
  .refine((d) => Boolean(d.productId || d.ingredientId || d.concernSlug), {
    message: 'A post must anchor to at least one of product, ingredient, or concern',
    path: ['anchors'],
  })

export const createPostReplySchema = z.object({ content: z.string().min(1).max(2000) })

export type CreatePostInput = z.infer<typeof createPostSchema>
export type CreatePostReplyInput = z.infer<typeof createPostReplySchema>

export type SocialPostView = {
  id: string
  authorId: string | null
  authorName: string | null
  tone: PostTone
  content: string
  productId: string | null
  ingredientId: string | null
  concernSlug: SkinConcern | null
  createdAt: string
}

export type SocialPostReplyView = {
  id: string
  postId: string
  authorId: string | null
  authorName: string | null
  content: string
  createdAt: string
}

export type SocialPostWithReplies = SocialPostView & {
  replyCount: number
  replies: SocialPostReplyView[]
}

// Surface view (T5b): a post as shown on a profile or product page. Anchors are
// resolved to displayable refs (the raw ids/slug are kept for client linking);
// the author carries profilePublic so callers gate the /u/:username link exactly
// like ReviewerName. Concern stays the picked 22-term slug (label client-side).
export type SocialPostSurfaceView = {
  id: string
  content: string
  tone: PostTone
  concernSlug: SkinConcern | null
  productAnchor: { slug: string; name: string } | null
  ingredientAnchor: { slug: string; name: string } | null
  createdAt: string
  author: { username: string; profilePublic: boolean }
}

export type PublicProfilePostsResponse = { posts: SocialPostSurfaceView[] }
export type PublicProductPostsResponse = { posts: SocialPostSurfaceView[] }

export type SocialPostErrorCode =
  | 'post_not_found'
  | 'reply_not_found'
  | 'post_creation_failed'
  | 'reply_creation_failed'
  | 'anchor_not_found'

export const socialPostErrorMapping = {
  post_not_found: HTTP_STATUS.NOT_FOUND,
  reply_not_found: HTTP_STATUS.NOT_FOUND,
  post_creation_failed: HTTP_STATUS.INTERNAL_SERVER_ERROR,
  reply_creation_failed: HTTP_STATUS.INTERNAL_SERVER_ERROR,
  anchor_not_found: HTTP_STATUS.NOT_FOUND,
} as const satisfies Record<SocialPostErrorCode, HttpStatus>
