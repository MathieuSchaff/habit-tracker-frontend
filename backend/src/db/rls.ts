import { sql } from 'drizzle-orm'

import type { Transaction } from './index'

// Binds app.user_id for the lifetime of a drizzle transaction so RLS policies
// on tenant tables (habits, tasks, profiles, ...) allow inserts/reads.
// Use this INSIDE pre-identity paths (signup, createDemo, OAuth, email-confirm,
// password-reset) where the withRlsContext Hono middleware does not run.
// Authenticated request-scoped transactions should rely on withRlsContext instead.
export async function bindRlsContext(tx: Transaction, userId: string): Promise<void> {
  await tx.execute(sql`SELECT set_config('app.user_id', ${userId}, true)`)
}
