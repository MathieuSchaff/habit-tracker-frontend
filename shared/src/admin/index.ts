import { z } from 'zod'

import type { ApiResponse, CommonErrorCode, HttpStatus } from '../core'
import { HTTP_STATUS } from '../core'

// Mirror of the DB `ban_scope` enum (backend/src/db/schema/auth/user-bans.ts).
// Keep in sync if a new scope is added.
export const banScopeSchema = z.enum([
  'global',
  'ingredient_edit',
  'product_edit',
  'product_create',
  'ingredient_create',
  'discussion_post',
  'review_publish',
])

export type BanScope = z.infer<typeof banScopeSchema>

export const createBanBodySchema = z.object({
  scope: banScopeSchema,
  // Trim before length check so whitespace-only payloads are rejected.
  reason: z.string().trim().min(1).max(500).optional(),
  // ISO 8601 UTC — backend rejects past timestamps as invalid_input.
  expiresAt: z.iso.datetime().optional(),
})

export type CreateBanInput = z.infer<typeof createBanBodySchema>

export type AdminBanErrorCode = CommonErrorCode | 'cannot_self_ban' | 'already_banned'

export const adminBanErrorMapping = {
  cannot_self_ban: HTTP_STATUS.BAD_REQUEST,
  already_banned: HTTP_STATUS.CONFLICT,
} as const satisfies Partial<Record<AdminBanErrorCode, HttpStatus>>

export type CreateBanResponse = {
  id: string
  userId: string
  scope: BanScope
  reason: string | null
  bannedBy: string
  expiresAt: string | null
  createdAt: string
}

export type CreateBanResult = ApiResponse<CreateBanResponse, AdminBanErrorCode>

// PATCH body: scope is immutable (creating a new ban is the right move for a
// different scope). Both fields nullable so admin can clear reason or make a
// ban permanent (expiresAt → null).
export const updateBanBodySchema = z
  .object({
    reason: z.string().trim().min(1).max(500).nullable().optional(),
    expiresAt: z.iso.datetime().nullable().optional(),
  })
  .refine((v) => v.reason !== undefined || v.expiresAt !== undefined, {
    message: 'At least one of reason or expiresAt must be set',
  })

export type UpdateBanInput = z.infer<typeof updateBanBodySchema>

export type UpdateBanResult = ApiResponse<CreateBanResponse, AdminBanErrorCode>

export type AdminUserListItem = {
  id: string
  email: string
  role: 'user' | 'admin' | 'contributor'
  emailVerifiedAt: string | null
  createdAt: string
  // From profiles.forcedPrivateByAdmin (LEFT JOIN, defaulted to false if no
  // profile row yet). Lets the admin UI hydrate the force-private toggle.
  forcedPrivateByAdmin: boolean
}

export type ListUsersResponse = {
  items: AdminUserListItem[]
}

// Admin-only demotion of a contributor back to a plain user (S6). The only
// allowed target role is 'user'; promotion goes through the separate role-request
// flow. reason is operational context (validated + logged) and is not persisted:
// a demote is a one-shot mutation with no ongoing state row to attach it to,
// unlike a ban row or a force-private flag, and no role-change audit table exists.
export const updateRoleBodySchema = z.object({
  role: z.literal('user'),
  reason: z.string().trim().min(1).max(500).optional(),
})

export type UpdateRoleInput = z.infer<typeof updateRoleBodySchema>

export type AdminRoleErrorCode = CommonErrorCode | 'cannot_self_demote' | 'not_a_contributor'

export const adminRoleErrorMapping = {
  cannot_self_demote: HTTP_STATUS.BAD_REQUEST,
  not_a_contributor: HTTP_STATUS.CONFLICT,
} as const satisfies Partial<Record<AdminRoleErrorCode, HttpStatus>>

export type UpdateRoleResponse = {
  id: string
  role: 'user' | 'admin' | 'contributor'
}

export type UpdateRoleResult = ApiResponse<UpdateRoleResponse, AdminRoleErrorCode>

// Mirror of the DB `moderation_status` enum (backend/src/db/schema/_moderation.ts).
export const moderationStatusSchema = z.enum(['visible', 'hidden'])
export type ModerationStatus = z.infer<typeof moderationStatusSchema>

export const moderateContentBodySchema = z.object({
  status: moderationStatusSchema,
  reason: z.string().trim().min(1).max(500).nullable().optional(),
})

export type ModerateContentInput = z.infer<typeof moderateContentBodySchema>

// Catalog quality stamp: verify can only move a row to 'verified' (un-verify is
// out of scope), so the body is a single literal.
export const verifyQualityBodySchema = z.object({ quality: z.literal('verified') })
export type VerifyQualityInput = z.infer<typeof verifyQualityBodySchema>

export type ModerateContentResult = ApiResponse<
  { id: string; moderationStatus: ModerationStatus; moderationReason: string | null },
  CommonErrorCode
>

export type ModerationTarget = 'reviews' | 'threads' | 'replies' | 'products' | 'ingredients'

// Quick admin dashboard snapshot — at-a-glance counts so admins land on the
// workload, not on an arbitrary subpage.
export type AdminDashboard = {
  openReports: number
  activeBans: number
  hiddenReviews: number
  hiddenThreads: number
  hiddenReplies: number
  forcedPrivateProfiles: number
}

// Admin override on a user profile. forcedPrivate=true hides every public
// surface for that profile (and reviewer pseudonym on public reviews).
// forcedPrivate=false clears the override and restores the user's own toggle.
export const moderateProfileBodySchema = z.object({
  forcedPrivate: z.boolean(),
  reason: z.string().trim().min(1).max(500).nullable().optional(),
})

export type ModerateProfileInput = z.infer<typeof moderateProfileBodySchema>

export type ModerateProfileResult = ApiResponse<
  { userId: string; forcedPrivateByAdmin: boolean; forcedPrivateReason: string | null },
  CommonErrorCode
>

// Admin-only preview of moderated content. Bypasses the public 'visible' filter
// so admins can read hidden rows before deciding to restore or keep down.
export type ContentPreview = {
  id: string
  moderationStatus: ModerationStatus
  moderationReason: string | null
  authorId: string | null
  authorUsername: string | null
  createdAt: string
} & (
  | { kind: 'review'; comment: string | null }
  | { kind: 'thread'; title: string; content: string }
  | { kind: 'reply'; content: string }
  | { kind: 'product'; name: string; brand: string; slug: string }
  | { kind: 'ingredient'; name: string; slug: string }
)

export type ContentPreviewResult = ApiResponse<ContentPreview, CommonErrorCode>
