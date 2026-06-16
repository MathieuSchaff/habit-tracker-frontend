import { z } from 'zod'

// Mirror of the DB `error_source` enum (backend/src/db/schema/monitoring/errors.ts).
export const errorSourceSchema = z.enum(['backend', 'frontend'])
export type ErrorSource = z.infer<typeof errorSourceSchema>

// Derived from `resolved_at` nullability, not a stored column.
export const errorGroupStatusSchema = z.enum(['open', 'resolved'])
export type ErrorGroupStatus = z.infer<typeof errorGroupStatusSchema>

export const listErrorGroupsQuerySchema = z.object({
  status: errorGroupStatusSchema.optional(),
  source: errorSourceSchema.optional(),
})
export type ListErrorGroupsQuery = z.infer<typeof listErrorGroupsQuerySchema>

export const resolveErrorGroupBodySchema = z.object({
  resolved: z.boolean(),
})
export type ResolveErrorGroupInput = z.infer<typeof resolveErrorGroupBodySchema>

export type ErrorGroupView = {
  id: string
  fingerprint: string
  source: ErrorSource
  message: string
  stack: string | null
  // jsonb of arbitrary shape per call site (path, mutationKey, componentStack…).
  context: unknown
  count: number
  affectedUsers: number
  firstSeenAt: string
  lastSeenAt: string
  resolvedAt: string | null
}

export type ListErrorGroupsResponse = { items: ErrorGroupView[] }
