import { z } from 'zod'

// Mirror of the DB `security_severity` enum (backend/src/db/schema/monitoring/security-events.ts).
export const securitySeveritySchema = z.enum(['high', 'low'])
export type SecuritySeverity = z.infer<typeof securitySeveritySchema>

export const listSecurityEventsQuerySchema = z.object({
  severity: securitySeveritySchema.optional(),
})
export type ListSecurityEventsQuery = z.infer<typeof listSecurityEventsQuerySchema>

export type SecurityEventView = {
  id: string
  userId: string
  severity: SecuritySeverity
  eventType: string
  field: string
  // Already truncated at 200 chars by the writer (input-guard hit, not a full dump).
  payload: string
  route: string
  createdAt: string
}

export type ListSecurityEventsResponse = { items: SecurityEventView[] }
