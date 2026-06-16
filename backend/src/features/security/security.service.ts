import type { ListSecurityEventsResponse, SecuritySeverity } from '@aurore/shared'

import { and, count, desc, eq, gt, sql } from 'drizzle-orm'

import type { Database } from '../../db'
import { securityEvents } from '../../db/schema'

const HIGH_SEVERITY_BLOCK_THRESHOLD = 3
const BLOCK_WINDOW_DAYS = 7
// Bound the admin feed; recent-first, the older tail is the CLI's job (prod-security).
const SECURITY_EVENTS_LIST_LIMIT = 200

export interface SecurityEventInput {
  userId: string
  severity: SecuritySeverity
  eventType: string
  field: string
  payload: string
  route: string
}

export async function logSecurityEvent(db: Database, event: SecurityEventInput): Promise<void> {
  await db.insert(securityEvents).values({
    ...event,
    payload: event.payload.slice(0, 200),
  })
}

export async function listSecurityEvents(
  db: Database,
  filters: { severity?: SecuritySeverity }
): Promise<ListSecurityEventsResponse> {
  const items = await db
    .select()
    .from(securityEvents)
    .where(filters.severity ? eq(securityEvents.severity, filters.severity) : undefined)
    .orderBy(desc(securityEvents.createdAt))
    .limit(SECURITY_EVENTS_LIST_LIMIT)

  return { items }
}

export async function isUserBlocked(db: Database, userId: string): Promise<boolean> {
  const windowStart = new Date()
  windowStart.setDate(windowStart.getDate() - BLOCK_WINDOW_DAYS)

  const [row] = await db
    .select({ total: count() })
    .from(securityEvents)
    .where(
      and(
        eq(securityEvents.userId, userId),
        eq(securityEvents.severity, 'high'),
        gt(securityEvents.createdAt, sql`${windowStart.toISOString()}`)
      )
    )

  return (row?.total ?? 0) >= HIGH_SEVERITY_BLOCK_THRESHOLD
}
