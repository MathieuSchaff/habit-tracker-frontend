import type { CreateReportInput, ListReportsResponse, ReportStatus } from '@aurore/shared'

import { and, desc, eq, isNotNull } from 'drizzle-orm'

import type { Database } from '../../db'
import { contentReports } from '../../db/schema'
import { nowISO } from '../../utils/dates'
import { ReportError } from './report-error'

export async function createReport(
  db: Database,
  args: { reporterId: string; body: CreateReportInput }
) {
  const [row] = await db
    .insert(contentReports)
    .values({
      reporterId: args.reporterId,
      targetType: args.body.targetType,
      targetId: args.body.targetId,
      reason: args.body.reason,
    })
    .returning()

  if (!row) throw new ReportError('server_error')
  return row
}

export async function listReports(
  db: Database,
  filters: { status?: ReportStatus; escalated?: 'true' }
): Promise<ListReportsResponse> {
  const conditions = []
  if (filters.status) conditions.push(eq(contentReports.status, filters.status))
  if (filters.escalated === 'true') conditions.push(isNotNull(contentReports.escalatedAt))

  const rows = await db
    .select()
    .from(contentReports)
    .where(conditions.length ? and(...conditions) : undefined)
    .orderBy(desc(contentReports.createdAt))

  return { items: rows }
}

export async function resolveReport(
  db: Database,
  args: { id: string; adminId: string; status: 'resolved' | 'dismissed' }
) {
  const [row] = await db
    .update(contentReports)
    .set({
      status: args.status,
      reviewedBy: args.adminId,
      reviewedAt: nowISO(),
    })
    .where(eq(contentReports.id, args.id))
    .returning()

  if (!row) throw new ReportError('not_found')
  return row
}

// Escalation is orthogonal to status (ADR-0006 S3): the report stays open while
// escalated, then resolves normally. The admin surfaces it via the escalated filter.
// Re-escalating overwrites attribution (last escalator wins), same posture as
// resolveReport's reviewedBy; the UI hides the action once escalated.
export async function escalateReport(db: Database, args: { id: string; moderatorId: string }) {
  const [row] = await db
    .update(contentReports)
    .set({ escalatedAt: nowISO(), escalatedBy: args.moderatorId })
    .where(eq(contentReports.id, args.id))
    .returning()

  if (!row) throw new ReportError('not_found')
  return row
}
