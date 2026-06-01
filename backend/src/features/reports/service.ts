import type { CreateReportInput, ListReportsResponse, ReportStatus } from '@aurore/shared'

import { desc, eq } from 'drizzle-orm'

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
  filters: { status?: ReportStatus }
): Promise<ListReportsResponse> {
  const rows = filters.status
    ? await db
        .select()
        .from(contentReports)
        .where(eq(contentReports.status, filters.status))
        .orderBy(desc(contentReports.createdAt))
    : await db.select().from(contentReports).orderBy(desc(contentReports.createdAt))

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
