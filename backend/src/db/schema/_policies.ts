import { type SQL, sql } from 'drizzle-orm'
import { type AnyPgColumn, pgPolicy } from 'drizzle-orm/pg-core'

import { appRuntimeRole } from './_roles'

// Requires a direct user_id column. For FK-chained ownership, use fkTenantPolicies.
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

// For FK-chained ownership: caller provides the EXISTS expression.
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
//   - <name>_select_public : USING (true). MUST NOT be gated by auth.role(),
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
// two-axis model: catalog_quality (unverified/verified) + moderation_status
// (visible/hidden). Distinct from catalogPolicies (tag defs, role-gated writes).
//
// Field-level integrity (no self-promotion to 'verified', admin-only moderation)
// lives in the service field-strip + the verify CHECK, NOT here: the privileged
// UPDATE branch lets contributors write any column at the RLS layer.
export function catalogSubmissionPolicies(name: string, createdByColumn: AnyPgColumn) {
  return [
    // Public reads see 'visible' rows; the moderator (admin∨contributor) also sees
    // 'hidden' so a reported sheet can be reviewed/restored. The owner
    // sees their own 'hidden' rows ONLY while app.own_submissions is set (the
    // /me/submissions path) — plain browse stays honest, the author's hidden sheet
    // never resurfaces in the public grid. This owner clause is the DB-layer scope
    // for getMySubmissions; its createdBy filter is then defence-in-depth, not the
    // sole guard against leaking other users' hidden rows.
    pgPolicy(`${name}_select_visible`, {
      as: 'permissive',
      for: 'select',
      to: appRuntimeRole,
      using: sql`moderation_status = 'visible' OR (SELECT auth.role()) IN ('admin', 'contributor') OR (${createdByColumn} = (SELECT auth.uid()) AND current_setting('app.own_submissions', true) = 'on')`,
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

// Extends base tenant policies to grant contributors the reversible moderation surface:
// read any row (incl. hidden) and UPDATE it. Additive, owner CRUD and
// admin_bypass still apply. Write path is the moderation service (4 moderation_* columns
// only), so the coarse role gate is safe (the field-level limits mirror catalogSubmissionPolicies).
export function moderationPolicies(name: string) {
  const roleCheck = sql`(SELECT auth.role()) IN ('admin', 'contributor')`
  return [
    pgPolicy(`${name}_moderation_select`, {
      as: 'permissive',
      for: 'select',
      to: appRuntimeRole,
      using: roleCheck,
    }),
    pgPolicy(`${name}_moderation_update`, {
      as: 'permissive',
      for: 'update',
      to: appRuntimeRole,
      using: roleCheck,
      withCheck: roleCheck,
    }),
  ]
}
