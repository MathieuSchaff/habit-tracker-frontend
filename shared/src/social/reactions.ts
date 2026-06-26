import { z } from 'zod'

import { HTTP_STATUS, type HttpStatus } from '../core'

// Polymorphic over four conversation surfaces; a Review is never reactable
// (ADR-0013).
export const REACTABLE_TYPES = ['post', 'thread', 'post_reply', 'thread_reply'] as const
export type ReactableType = (typeof REACTABLE_TYPES)[number]

// Small fixed entraide set (ADR-0013) — gratitude / recognition / encouragement.
// Never extend toward an evaluative vote.
export const REACTION_KINDS = ['merci', 'moi-aussi', 'soutien'] as const
export type ReactionKind = (typeof REACTION_KINDS)[number]

// Body for POST (ensure-on) and DELETE (ensure-off): the verb carries the toggle
// direction, the body identifies the (target, kind).
export const reactionInputSchema = z.object({
  reactableType: z.enum(REACTABLE_TYPES),
  reactableId: z.uuid(),
  kind: z.enum(REACTION_KINDS),
})
export type ReactionInput = z.infer<typeof reactionInputSchema>

// Read query: the polymorphic target (no kind — returns every kind).
export const reactionQuerySchema = z.object({
  reactableType: z.enum(REACTABLE_TYPES),
  reactableId: z.uuid(),
})
export type ReactionQuery = z.infer<typeof reactionQuerySchema>

// A reactor is always signed (username), never a count (ADR-0013). profilePublic
// gates the /u link client-side, like ReviewerName.
export type Reactor = { username: string; profilePublic: boolean }

// The signed read: who reacted, grouped by kind, plus the viewer's own kinds for
// button pressed-state. No total anywhere.
export type ReactionListView = {
  reactableType: ReactableType
  reactableId: string
  reactions: Record<ReactionKind, Reactor[]>
  viewerKinds: ReactionKind[]
}

export type SocialReactionErrorCode = 'reactable_not_found'

export const socialReactionErrorMapping = {
  reactable_not_found: HTTP_STATUS.NOT_FOUND,
} as const satisfies Record<SocialReactionErrorCode, HttpStatus>
