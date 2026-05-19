import { sql } from 'drizzle-orm'

import type { DB } from '../../db/index'
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
