import { sql, TransactionRollbackError } from 'drizzle-orm'
import type { Context, Next } from 'hono'

import type { AppEnv } from '../../app-env'
import { getAuthedUserRole } from './middleware'

// Wraps authenticated requests in a tx and sets RLS context (app.user_id, app.role).
// Must run after requireJwtAuth. Skips when userId is absent (public routes).
//
// Invariant: services must re-throw DB errors. If a service swallows a DB error,
// c.error stays null and this middleware commits an already-aborted tx, producing 500.
//
// Hono's onError fires before this middleware resumes, leaving the pg tx aborted.
// We detect this via c.error and call tx.rollback() explicitly, then suppress the
// resulting TransactionRollbackError so the already-set 4xx response propagates cleanly.
export const withRlsContext = async (c: Context<AppEnv>, next: Next) => {
  const userId = c.get('userId')

  if (!userId) {
    await next()
    return
  }

  const baseDb = c.get('db')
  // Throws if userId is set but role is not: programmer error (requireJwtAuth not chained).
  const role = getAuthedUserRole(c)

  try {
    await baseDb.transaction(async (tx) => {
      // SET LOCAL only accepts literal strings, making concatenation an injection risk.
      // set_config() takes a parameterized value, so it is safe.
      await tx.execute(sql`SELECT set_config('app.user_id', ${userId}, true)`)
      await tx.execute(sql`SELECT set_config('app.role', ${role}, true)`)
      c.set('db', tx as unknown as typeof baseDb)
      await next()
      if (c.error) {
        tx.rollback()
      }
    })
  } catch (e) {
    // Suppress expected rollback error; 4xx response is already set in c.res.
    if (e instanceof TransactionRollbackError) return
    throw e
  }
}
