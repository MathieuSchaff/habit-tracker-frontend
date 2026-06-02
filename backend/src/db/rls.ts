import { sql } from 'drizzle-orm'

import { db, type Transaction } from './index'

// Binds app.user_id for the lifetime of a drizzle transaction so RLS policies
// on tenant tables (habits, tasks, profiles, ...) allow inserts/reads.
// Use this INSIDE pre-identity paths (signup, createDemo, OAuth, email-confirm,
// password-reset) where the withRlsContext Hono middleware does not run.
// Authenticated request-scoped transactions should rely on withRlsContext instead.
export async function bindRlsContext(tx: Transaction, userId: string): Promise<void> {
  await tx.execute(sql`SELECT set_config('app.user_id', ${userId}, true)`)
}

// Runs `fn` in a transaction with app.role='admin' set LOCAL to it, so RLS
// write policies on catalog tables accept the writes. Use in trusted CLI/seed
// runners that mutate catalog tables via the app_runtime `db` connection.
// (Bare `db.execute(SET LOCAL ...)` outside a tx is a no-op, see catalog RLS.)
export async function withAdminRls<T>(fn: (tx: Transaction) => Promise<T>): Promise<T> {
  return db.transaction(async (tx) => {
    await tx.execute(sql`SET LOCAL app.role = 'admin'`)
    return fn(tx)
  })
}
