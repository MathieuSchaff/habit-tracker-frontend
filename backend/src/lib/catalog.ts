import { sql } from 'drizzle-orm'

import type { DB } from '../db/index'
import { isUniqueViolation } from './helpers'

export type CatalogRole = 'user' | 'admin' | 'contributor'

const HOURLY_SUBMISSION_LIMIT = 10
const DAILY_SUBMISSION_LIMIT = 50

type SubmissionCountFn = 'count_recent_product_submissions' | 'count_recent_ingredient_submissions'

// Quality stamp for a new catalog row. Contributors and admins create verified
// rows (stamped with who/when); a plain user creates an unverified row with no
// stamp, the verify CHECK (V-2) forbids a stamp on an unverified row.
export function resolveCatalogQuality(role: CatalogRole, userId: string) {
  const verified = role === 'admin' || role === 'contributor'
  return {
    catalogQuality: verified ? ('verified' as const) : ('unverified' as const),
    verifiedBy: verified ? userId : null,
    verifiedAt: verified ? new Date().toISOString() : null,
  }
}

// Re-throws a Postgres unique violation (23505) as a domain conflict error so
// the withRlsContext transaction rolls back instead of committing an aborted tx
// (a swallowed 23505 surfaces as a 500). Any other error propagates unchanged.
export function translateUniqueViolation(e: unknown, toConflict: () => Error): never {
  if (isUniqueViolation(e)) throw toConflict()
  throw e
}

type AdminFields = 'moderatedBy' | 'moderatedAt' | 'moderationReason' | 'verifiedBy' | 'verifiedAt'

// Strips internal admin/moderation stamps from a public-facing catalog row.
// catalog_quality stays (drives the "non vérifié" badge). moderationStatus
// stays (admin reads need it; public users only ever see 'visible' via RLS).
export function stripAdminFields<T extends Partial<Record<AdminFields, unknown>>>(
  row: T
): Omit<T, AdminFields> {
  const { moderatedBy, moderatedAt, moderationReason, verifiedBy, verifiedAt, ...rest } = row as T &
    Record<AdminFields, unknown>
  void moderatedBy
  void moderatedAt
  void moderationReason
  void verifiedBy
  void verifiedAt
  return rest as Omit<T, AdminFields>
}

// Rate-limits self-service catalog submissions (C-2). Counts the user's recent
// rows via a SECURITY DEFINER function so hidden rows still count, hiding spam
// must not refill the quota. Contributors and admins are exempt.
export async function assertWithinSubmissionRateLimit(
  database: DB,
  countFn: SubmissionCountFn,
  userId: string,
  role: CatalogRole,
  onExceeded: () => Error
): Promise<void> {
  if (role === 'admin' || role === 'contributor') return

  const rows = await database.execute(
    sql`SELECT hr, day FROM ${sql.identifier(countFn)}(${userId})`
  )
  const row = rows[0] as { hr: number | bigint; day: number | bigint } | undefined
  const hourly = Number(row?.hr ?? 0)
  const daily = Number(row?.day ?? 0)
  if (hourly >= HOURLY_SUBMISSION_LIMIT || daily >= DAILY_SUBMISSION_LIMIT) throw onExceeded()
}
