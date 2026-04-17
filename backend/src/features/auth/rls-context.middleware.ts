import { sql, TransactionRollbackError } from 'drizzle-orm'
import type { Context, Next } from 'hono'

import type { AppEnv } from '../../app-env'

// Wrap authenticated requests in a tx and bind per-request RLS context.
// Must run AFTER requireJwtAuth so c.get('userId') is set.
// Skips gracefully when userId is absent (e.g. public GET routes with optional auth).
//
// Hono's onError swallows domain errors before they propagate back through next().
// If the route ran a failing DB op (e.g. unique constraint), the Postgres transaction
// is aborted and a subsequent COMMIT would throw a PostgresError (500).
// We detect this via c.error (set by Hono when onError fires) and trigger an explicit
// rollback via tx.rollback() — then suppress the resulting TransactionRollbackError
// so the already-set error response (e.g. 409) is returned cleanly.
//
// INVARIANT: Services that touch the DB MUST re-throw Postgres errors (or domain
// errors derived from them). If a service catches a DB error and returns a normal
// response, Hono's onError does not fire, c.error stays null, and this middleware
// attempts to COMMIT an already-aborted Postgres transaction — which throws 500.
// Every service in this codebase currently re-throws; keep it that way.
export const withRlsContext = async (c: Context<AppEnv>, next: Next) => {
  const userId = c.get('userId')

  // No identity set — this is a public request, skip RLS wrapping.
  if (!userId) {
    await next()
    return
  }

  const baseDb = c.get('db')
  const role = c.get('userRole') // required per AppEnv; always set by requireJwtAuth before this middleware

  try {
    await baseDb.transaction(async (tx) => {
      await tx.execute(sql`SELECT set_config('app.user_id', ${userId}, true)`)
      await tx.execute(sql`SELECT set_config('app.role', ${role}, true)`)
      c.set('db', tx as unknown as typeof baseDb)
      await next()
      // Hono's onError sets c.error when it handles a domain error. If a DB op
      // inside next() failed (aborted the pg transaction), we must rollback before
      // Drizzle tries to COMMIT the aborted transaction (which would throw 500).
      if (c.error) {
        tx.rollback()
      }
    })
  } catch (e) {
    // Suppress the TransactionRollbackError we triggered above — the 409/4xx
    // response from Hono's error handler is already set in c.res.
    if (e instanceof TransactionRollbackError) return
    throw e
  }
}
