import { type SQL, sql } from 'drizzle-orm'
import { type AnyPgColumn, pgPolicy } from 'drizzle-orm/pg-core'

import { appRuntimeRole } from './_roles'

// Helper for tenant-isolated tables (users own their rows via a direct user_id column).
// Returns the 2 standard policies we use everywhere:
//   - <name>_tenant_isolation : userId = auth.uid()
//   - <name>_admin_bypass     : auth.role() = 'admin'
//
// Use only when the table has a direct user_id column. For FK-chained
// ownership (e.g. subtasks → tasks.user_id), write the EXISTS form by hand.
//
// Example:
//   export const tasks = pgTable('tasks', {
//     userId: uuid('user_id').notNull(),
//     // ...
//   }, (t) => [
//     ...tenantPolicies('tasks', t.userId),
//   ]).enableRLS()
export function tenantPolicies(name: string, userIdColumn: AnyPgColumn) {
  return [
    pgPolicy(`${name}_tenant_isolation`, {
      as: 'permissive',
      for: 'all',
      to: appRuntimeRole,
      using: sql`${userIdColumn} = (SELECT auth.uid())`,
      withCheck: sql`${userIdColumn} = (SELECT auth.uid())`,
    }),
    pgPolicy(`${name}_admin_bypass`, {
      as: 'permissive',
      for: 'all',
      to: appRuntimeRole,
      using: sql`(SELECT auth.role()) = 'admin'`,
      withCheck: sql`(SELECT auth.role()) = 'admin'`,
    }),
  ]
}

// Same shape but for tables where ownership is reached through a parent table.
// Caller provides the EXISTS expression. Example:
//   ...fkTenantPolicies('subtasks', sql`EXISTS (SELECT 1 FROM ${tasks} p WHERE p.id = ${t.taskId} AND p.user_id = (SELECT auth.uid()))`)
export function fkTenantPolicies(name: string, ownershipExpr: SQL) {
  return [
    pgPolicy(`${name}_tenant_isolation`, {
      as: 'permissive',
      for: 'all',
      to: appRuntimeRole,
      using: ownershipExpr,
      withCheck: ownershipExpr,
    }),
    pgPolicy(`${name}_admin_bypass`, {
      as: 'permissive',
      for: 'all',
      to: appRuntimeRole,
      using: sql`(SELECT auth.role()) = 'admin'`,
      withCheck: sql`(SELECT auth.role()) = 'admin'`,
    }),
  ]
}
