import { and, eq, lt, sql } from 'drizzle-orm'

import { withAdminRls } from '../../db/rls'
import { users } from '../../db/schema'
import { logger } from '../../lib/logger'

// Deletes demo accounts past their TTL. Cascades to seeded rows (profile, tasks,
// collection) via FK. Admin RLS: the cron has no request-bound user context.
export async function sweepExpiredDemos(): Promise<number> {
  const deleted = await withAdminRls((tx) =>
    tx
      .delete(users)
      .where(and(eq(users.isDemo, true), lt(users.expiresAt, sql`now()`)))
      .returning({ id: users.id })
  )
  logger.info({ count: deleted.length }, 'expired demo users swept')
  return deleted.length
}
