import { and, count, eq, gt, sql } from 'drizzle-orm'

import type { Database } from '../../db'
import { securityEvents } from '../../db/schema'

const HIGH_SEVERITY_BLOCK_THRESHOLD = 3
const BLOCK_WINDOW_DAYS = 7

export type SecuritySeverity = 'high' | 'low'

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
