import { pgRole } from 'drizzle-orm/pg-core'

// Roles are created and granted by hand-written migrations (0017, 0024, 0037),
// not by drizzle-kit. `.existing()` tells drizzle they already live in the DB
// so it never tries to CREATE/DROP them. Used for type-safe `to:` in pgPolicy.
export const appRuntimeRole = pgRole('app_runtime').existing()
export const devReadonlyRole = pgRole('dev_readonly').existing()
