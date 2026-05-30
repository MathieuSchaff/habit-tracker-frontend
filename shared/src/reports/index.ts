import { z } from 'zod'

// Mirror of the DB `report_target_type` enum
// (backend/src/db/schema/monitoring/content-reports.ts).
export const reportTargetTypeSchema = z.enum([
  'review',
  'thread',
  'reply',
  'profile',
  'product',
  'ingredient',
])
export type ReportTargetType = z.infer<typeof reportTargetTypeSchema>

export const reportStatusSchema = z.enum(['open', 'resolved', 'dismissed'])
export type ReportStatus = z.infer<typeof reportStatusSchema>

export const createReportBodySchema = z.object({
  targetType: reportTargetTypeSchema,
  targetId: z.uuid(),
  // Trim before length check so whitespace-only is rejected.
  reason: z.string().trim().min(1).max(500),
})

export type CreateReportInput = z.infer<typeof createReportBodySchema>

export const resolveReportBodySchema = z.object({
  status: z.enum(['resolved', 'dismissed']),
})

export type ResolveReportInput = z.infer<typeof resolveReportBodySchema>

export const listReportsQuerySchema = z.object({
  status: reportStatusSchema.optional(),
})

export type ListReportsQuery = z.infer<typeof listReportsQuerySchema>

export type ReportView = {
  id: string
  reporterId: string
  targetType: ReportTargetType
  targetId: string
  reason: string
  status: ReportStatus
  reviewedBy: string | null
  reviewedAt: string | null
  createdAt: string
}

export type ListReportsResponse = { items: ReportView[] }
