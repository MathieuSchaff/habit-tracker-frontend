import type { ErrorGroupStatus, ErrorSource, ListErrorGroupsResponse } from '@aurore/shared'

import { and, countDistinct, desc, eq, isNotNull, isNull, sql } from 'drizzle-orm'

import type { DB } from '../../db/index'
import type { ErrorGroup } from '../../db/schema'
import { errorGroups, errorOccurrences } from '../../db/schema'
import { nowISO } from '../../utils/dates'
import { computeFingerprint } from './lib/error-fingerprint'

export interface TrackErrorInput {
  source: 'backend' | 'frontend'
  message: string
  stack?: string | null
  context?: Record<string, unknown> | null
  userId?: string | null
}

export async function trackError(db: DB, input: TrackErrorInput): Promise<void> {
  const { source, message, stack, context, userId } = input
  const fingerprint = computeFingerprint(source, message, stack)

  const now = nowISO()
  const [group] = await db
    .insert(errorGroups)
    .values({
      fingerprint,
      source,
      message,
      stack: stack ?? null,
      context: context ?? null,
      count: 1,
      firstSeenAt: now,
      lastSeenAt: now,
    })
    .onConflictDoUpdate({
      target: errorGroups.fingerprint,
      set: {
        count: sql`${errorGroups.count} + 1`,
        lastSeenAt: sql`now()`,
        stack: sql`excluded.stack`,
        context: sql`excluded.context`,
      },
    })
    .returning({ id: errorGroups.id })

  await db.insert(errorOccurrences).values({
    groupId: group.id,
    userId: userId ?? null,
    occurredAt: now,
  })
}

export async function listErrorGroups(
  db: DB,
  filters: { status?: ErrorGroupStatus; source?: ErrorSource }
): Promise<ListErrorGroupsResponse> {
  const conditions = []
  if (filters.status === 'open') conditions.push(isNull(errorGroups.resolvedAt))
  if (filters.status === 'resolved') conditions.push(isNotNull(errorGroups.resolvedAt))
  if (filters.source) conditions.push(eq(errorGroups.source, filters.source))

  const items = await db
    .select({
      id: errorGroups.id,
      fingerprint: errorGroups.fingerprint,
      source: errorGroups.source,
      message: errorGroups.message,
      stack: errorGroups.stack,
      context: errorGroups.context,
      count: errorGroups.count,
      // Distinct affected users — tells apart "one user, 64 retries" from "64 users hit".
      // Group-by the PK so the non-aggregated columns are functionally dependent.
      affectedUsers: countDistinct(errorOccurrences.userId),
      firstSeenAt: errorGroups.firstSeenAt,
      lastSeenAt: errorGroups.lastSeenAt,
      resolvedAt: errorGroups.resolvedAt,
    })
    .from(errorGroups)
    .leftJoin(errorOccurrences, eq(errorOccurrences.groupId, errorGroups.id))
    .where(conditions.length ? and(...conditions) : undefined)
    .groupBy(errorGroups.id)
    .orderBy(desc(errorGroups.lastSeenAt))

  return { items }
}

export async function resolveErrorGroup(
  db: DB,
  args: { id: string; resolved: boolean }
): Promise<ErrorGroup | null> {
  const [row] = await db
    .update(errorGroups)
    .set({ resolvedAt: args.resolved ? nowISO() : null })
    .where(eq(errorGroups.id, args.id))
    .returning()

  return row ?? null
}
