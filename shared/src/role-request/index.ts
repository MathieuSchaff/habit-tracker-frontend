import { z } from 'zod'

import type { ApiResponse, CommonErrorCode, HttpStatus } from '../core'
import { HTTP_STATUS, httpsUrl, noHtml } from '../core'

// Mirror of the DB `role_request_status` enum (backend/src/db/schema/auth/role-requests.ts).
export const roleRequestStatusSchema = z.enum(['pending', 'approved', 'rejected', 'cancelled'])
export type RoleRequestStatus = z.infer<typeof roleRequestStatusSchema>

export const submitRoleRequestBodySchema = z.object({
  // Trim before length so whitespace-only is rejected; noHtml blocks stored markup.
  motivation: noHtml(z.string().trim().min(10).max(1000)),
  // https-only (admin-reviewed link on an https app); absent = not provided, never '' or null.
  motivationLink: httpsUrl.optional(),
})
export type SubmitRoleRequestInput = z.infer<typeof submitRoleRequestBodySchema>

// Discriminated so `reason` is required-and-non-empty only on reject — impossible to
// forget at the type level, no superRefine.
export const reviewRoleRequestBodySchema = z.discriminatedUnion('decision', [
  z.object({ decision: z.literal('approve') }),
  z.object({ decision: z.literal('reject'), reason: noHtml(z.string().trim().min(1).max(500)) }),
])
export type ReviewRoleRequestInput = z.infer<typeof reviewRoleRequestBodySchema>

export const listRoleRequestsQuerySchema = z.object({
  status: roleRequestStatusSchema.optional(),
})
export type ListRoleRequestsQuery = z.infer<typeof listRoleRequestsQuerySchema>

export type RoleRequestView = {
  id: string
  userId: string
  motivation: string
  motivationLink: string | null
  status: RoleRequestStatus
  rejectionReason: string | null
  reviewedBy: string | null
  reviewedAt: string | null
  createdAt: string
  updatedAt: string
}

export type ListRoleRequestsResponse = { items: RoleRequestView[] }

export type SubmitRoleRequestErrorCode = CommonErrorCode | 'already_pending' | 'already_elevated'

export const submitRoleRequestErrorMapping = {
  already_pending: HTTP_STATUS.CONFLICT,
  already_elevated: HTTP_STATUS.CONFLICT,
} as const satisfies Partial<Record<SubmitRoleRequestErrorCode, HttpStatus>>

export type SubmitRoleRequestResult = ApiResponse<RoleRequestView, SubmitRoleRequestErrorCode>

export type CancelRoleRequestErrorCode = CommonErrorCode | 'not_pending'

export const cancelRoleRequestErrorMapping = {
  not_pending: HTTP_STATUS.CONFLICT,
} as const satisfies Partial<Record<CancelRoleRequestErrorCode, HttpStatus>>

export type CancelRoleRequestResult = ApiResponse<RoleRequestView, CancelRoleRequestErrorCode>

export type ReviewRoleRequestErrorCode = CommonErrorCode | 'not_pending'

export const reviewRoleRequestErrorMapping = {
  not_pending: HTTP_STATUS.CONFLICT,
} as const satisfies Partial<Record<ReviewRoleRequestErrorCode, HttpStatus>>

export type ReviewRoleRequestResult = ApiResponse<RoleRequestView, ReviewRoleRequestErrorCode>
