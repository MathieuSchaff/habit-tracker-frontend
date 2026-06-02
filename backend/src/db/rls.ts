import { sql } from 'drizzle-orm'

import { db, type Transaction } from './index'

// RLS policies read app.user_id to decide which rows the user can access.
// The `true` arg makes Postgres clear the setting when the transaction ends.
// Use on pre-auth paths (signup, OAuth, seed) where the Hono middleware hasn't run yet.
export async function bindRlsContext(tx: Transaction, userId: string): Promise<void> {
  await tx.execute(sql`SELECT set_config('app.user_id', ${userId}, true)`)
}

// SET LOCAL only survives inside a transaction
// =>  outside one it disappears after the first statement.
export async function withAdminRls<T>(fn: (tx: Transaction) => Promise<T>): Promise<T> {
  return db.transaction(async (tx) => {
    await tx.execute(sql`SET LOCAL app.role = 'admin'`)
    return fn(tx)
  })
}
