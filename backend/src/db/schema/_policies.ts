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

// Catalog tables: public SELECT, writes gated by app.role.
//   - <name>_select_public : USING (true). MUST NOT be gated by auth.role() —
//     anonymous GETs skip withRlsContext, so app.role is empty; gating SELECT
//     would break public browsing.
//   - <name>_write_role : INSERT/UPDATE/DELETE gated by app.role.
// writeRole 'contributor' → admin OR contributor ; 'admin' → admin only
// (tag definitions + ingredient↔tag links).
export function catalogPolicies(name: string, writeRole: 'contributor' | 'admin') {
  const roleCheck =
    writeRole === 'admin'
      ? sql`(SELECT auth.role()) = 'admin'`
      : sql`(SELECT auth.role()) IN ('admin', 'contributor')`
  return [
    pgPolicy(`${name}_select_public`, {
      as: 'permissive',
      for: 'select',
      to: appRuntimeRole,
      using: sql`true`,
    }),
    pgPolicy(`${name}_write_role`, {
      as: 'permissive',
      for: 'all',
      to: appRuntimeRole,
      using: roleCheck,
      withCheck: roleCheck,
    }),
  ]
}

// Catalog SUBMISSION tables (products, ingredients): user-generated, public-read,
// two-axis model — catalog_quality (unverified/verified) + moderation_status
// (visible/hidden). Distinct from catalogPolicies (tag defs, role-gated writes).
//
// Field-level integrity (no self-promotion to 'verified', admin-only moderation)
// lives in the service field-strip + the verify CHECK, NOT here: the privileged
// UPDATE branch lets contributors write any column at the RLS layer (V-2/C-1).
export function catalogSubmissionPolicies(name: string, createdByColumn: AnyPgColumn) {
  return [
    // Public reads see 'visible' rows; admin also sees 'hidden' (compose on all read paths).
    pgPolicy(`${name}_select_visible`, {
      as: 'permissive',
      for: 'select',
      to: appRuntimeRole,
      using: sql`moderation_status = 'visible' OR (SELECT auth.role()) = 'admin'`,
    }),
    // Admin/contributor insert anything (incl. seed/CLI via withAdminRls, which
    // sets no app.user_id); user inserts own row only while unverified + visible.
    // Mirrors update_owner_or_role so the trusted-writer path is symmetric.
    pgPolicy(`${name}_insert_self`, {
      as: 'permissive',
      for: 'insert',
      to: appRuntimeRole,
      withCheck: sql`(SELECT auth.role()) IN ('admin', 'contributor') OR (${createdByColumn} = (SELECT auth.uid()) AND catalog_quality = 'unverified' AND moderation_status = 'visible')`,
    }),
    // Admin/contributor edit anything; owner edits own row only while unverified + visible.
    pgPolicy(`${name}_update_owner_or_role`, {
      as: 'permissive',
      for: 'update',
      to: appRuntimeRole,
      using: sql`(SELECT auth.role()) IN ('admin', 'contributor') OR (${createdByColumn} = (SELECT auth.uid()) AND catalog_quality = 'unverified' AND moderation_status = 'visible')`,
      withCheck: sql`(SELECT auth.role()) IN ('admin', 'contributor') OR (${createdByColumn} = (SELECT auth.uid()) AND catalog_quality = 'unverified' AND moderation_status = 'visible')`,
    }),
    pgPolicy(`${name}_delete_admin`, {
      as: 'permissive',
      for: 'delete',
      to: appRuntimeRole,
      using: sql`(SELECT auth.role()) = 'admin'`,
    }),
  ]
}
