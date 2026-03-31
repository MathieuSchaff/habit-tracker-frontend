import { createHash } from 'node:crypto'

import { sql } from 'drizzle-orm'

import type { Database } from '../../db/index'
import { errorGroups, errorOccurrences } from '../../db/schema'

export interface TrackErrorInput {
  source: 'backend' | 'frontend'
  message: string
  stack?: string | null
  context?: Record<string, unknown> | null
  userId?: string | null
}

// Normalizes the first "at ..." frame by stripping :<line>:<col> so the same
// crash at different line numbers still maps to the same fingerprint.
function computeFingerprint(source: string, message: string, stack?: string | null): string {
  const firstFrame = stack?.split('\n').find((l) => l.trim().startsWith('at ')) ?? ''
  const normalized = firstFrame.replace(/:\d+:\d+\)?$/, '').trim()
  return createHash('sha256').update(`${source}|${message}|${normalized}`).digest('hex')
}

export async function trackError(db: Database, input: TrackErrorInput): Promise<void> {
  const { source, message, stack, context, userId } = input
  const fingerprint = computeFingerprint(source, message, stack)

  const [group] = await db
    .insert(errorGroups)
    .values({
      fingerprint,
      source,
      message,
      stack: stack ?? null,
      context: context ?? null,
      count: 1,
      firstSeenAt: new Date(),
      lastSeenAt: new Date(),
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
    occurredAt: new Date(),
  })
}
