import { sql, TransactionRollbackError } from 'drizzle-orm'
import type { Context, Next } from 'hono'

import type { AppEnv } from '../../app-env'

// Wrap authenticated requests in a tx and bind the request in question with RLS context.
// Must run AFTER requireJwtAuth so c.get('userId') is set.
// Skips when userId is absent (ex: public GET routes with optional auth).
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
      // set config because se local only support literal string, so we woul ddo concatenation of strings
      // can lead to sql injection. set_config is safer
      await tx.execute(sql`SELECT set_config('app.user_id', ${userId}, true)`)
      await tx.execute(sql`SELECT set_config('app.role', ${role}, true)`)
      // replace the db handler with the transaction
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

// 7. Le bloc if (c.error) { tx.rollback() }

// Subtil. Hono a un onError qui attrape les erreurs domain (ex: 409 Conflict). Quand ça arrive :
// - La route a lancé une erreur (ex: unique violation)
// - Postgres a aborté la TX automatiquement (état "aborted")
// - Hono a formé une réponse 409 propre
// - MAIS Drizzle s'apprête à COMMIT la TX aborted → Postgres renvoie 500

// La solution : si c.error est set, on force tx.rollback(). Drizzle lève TransactionRollbackError → on sort du bloc
// proprement.

// 8. Le catch (e)
// On swallow TransactionRollbackError (c'est NOUS qui l'avons déclenché, c'est attendu). Toute autre erreur → on
// re-throw.

// L'invariant critique (commentaires 17-21)

// ▎ Services that touch the DB MUST re-throw Postgres errors.

// Si un service catch une erreur DB et renvoie un succès applicatif → c.error reste null → le middleware essaie de
// COMMIT une TX aborted → 500.

// Règle implicite du codebase : jamais avaler silencieusement une erreur DB dans un service.
