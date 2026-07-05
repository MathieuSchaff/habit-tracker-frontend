import type { ProfileLink, SkinConcern, SkinType } from '@aurore/shared'

import { sql } from 'drizzle-orm'
import {
  type AnyPgColumn,
  boolean,
  check,
  index,
  integer,
  jsonb,
  pgEnum,
  pgPolicy,
  pgTable,
  pgView,
  text,
  timestamp,
  uniqueIndex,
  uuid,
  varchar,
} from 'drizzle-orm/pg-core'

import { tenantPolicies } from '../_policies'
import { appRuntimeRole } from '../_roles'
import { timestamps } from '../_timestamps'

export const userRoleEnum = pgEnum('user_role', ['user', 'admin', 'contributor'])

export const users = pgTable(
  'users',
  {
    id: uuid('id').primaryKey().default(sql`uuidv7()`),
    email: varchar('email', { length: 320 }).notNull(),

    // Nullable: user can sign up via Google without a password
    passwordHash: text('password_hash'),

    // Stable Google identifier (subject). Null if user never logged in with Google
    googleSub: text('google_sub'),

    ...timestamps,
    emailVerifiedAt: timestamp('email_verified_at', { withTimezone: true, mode: 'string' }),
    role: userRoleEnum('role').notNull().default('user'),
    deletedAt: timestamp('deleted_at', { withTimezone: true, mode: 'string' }),
    isDemo: boolean('is_demo').notNull().default(false),
    expiresAt: timestamp('expires_at', { withTimezone: true, mode: 'string' }),
    // Brute-force defense: incremented on every failed login, reset on success.
    // When >= LOGIN_LOCKOUT_THRESHOLD, lockedUntil is set; login() refuses until expiry.
    failedLoginAttempts: integer('failed_login_attempts').notNull().default(0),
    lockedUntil: timestamp('locked_until', { withTimezone: true, mode: 'string' }),
  },
  (t) => [
    // Case-insensitive unique email, only for active accounts
    uniqueIndex('users_email_active_unique_idx')
      .on(sql`lower(${t.email})`)
      .where(sql`deleted_at IS NULL`),
    // Partial index: only indexes Google users, keeps it small
    uniqueIndex('users_google_sub_ux').on(t.googleSub).where(sql`google_sub IS NOT NULL`),
  ]
)

export const profiles = pgTable(
  'profiles',
  {
    userId: uuid('user_id')
      .primaryKey()
      .references(() => users.id, { onDelete: 'cascade' }),
    username: varchar('username', { length: 32 }),
    avatarUrl: text('avatar_url'),
    bio: text('bio'),
    links: jsonb('links').$type<ProfileLink[]>().notNull().default(sql`'[]'::jsonb`),
    profilePublic: boolean('profile_public').notNull().default(false),
    bioPublic: boolean('bio_public').notNull().default(false),
    avatarPublic: boolean('avatar_public').notNull().default(false),
    linksPublic: boolean('links_public').notNull().default(false),
    // Admin override: when true, every public surface for this profile is
    // hidden regardless of the user's own profilePublic toggle. Reviews and
    // pseudonyms exposed via public-review joins disappear as a consequence.
    forcedPrivateByAdmin: boolean('forced_private_by_admin').notNull().default(false),
    forcedPrivateBy: uuid('forced_private_by').references((): AnyPgColumn => users.id, {
      onDelete: 'set null',
    }),
    forcedPrivateAt: timestamp('forced_private_at', { withTimezone: true, mode: 'string' }),
    forcedPrivateReason: text('forced_private_reason'),
    createdAt: timestamp('created_at', { withTimezone: true, mode: 'string' })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true, mode: 'string' })
      .notNull()
      .defaultNow(),
  },
  (t) => [
    uniqueIndex('profiles_username_ux').on(t.username),
    // Needed for public profile lookup by username (/u/:username)
    index('profiles_username_idx').on(t.username),
    pgPolicy('profiles_tenant_isolation', {
      as: 'permissive',
      for: 'all',
      to: appRuntimeRole,
      using: sql`${t.userId} = (SELECT auth.uid())`,
      withCheck: sql`${t.userId} = (SELECT auth.uid())`,
    }),
    pgPolicy('profiles_select_public', {
      as: 'permissive',
      for: 'select',
      to: appRuntimeRole,
      using: sql`${t.profilePublic} AND NOT ${t.forcedPrivateByAdmin}`,
    }),
    // A public review is a signed artifact, so its author's pseudonym must surface
    // even if their master flag stays false. Force-private still wins.
    pgPolicy('profiles_select_for_public_review', {
      as: 'permissive',
      for: 'select',
      to: appRuntimeRole,
      using: sql`NOT ${t.forcedPrivateByAdmin} AND EXISTS (
        SELECT 1 FROM user_product_reviews r
        JOIN user_products up ON up.id = r.user_product_id
        WHERE r.is_public = TRUE
          AND r.moderation_status = 'visible'
          AND up.user_id = ${t.userId}
      )`,
    }),
    // A signed reaction is public by doctrine (ADR-0013), so the reactor's pseudonym
    // must surface. No moderation_status guard: a reaction has no moderation of its
    // own. social_reactions has no RLS, so the EXISTS needs no SECURITY DEFINER.
    pgPolicy('profiles_select_for_reaction', {
      as: 'permissive',
      for: 'select',
      to: appRuntimeRole,
      using: sql`NOT ${t.forcedPrivateByAdmin} AND EXISTS (
        SELECT 1 FROM social_reactions sr WHERE sr.user_id = ${t.userId}
      )`,
    }),
    // A visible Post is a public signed artifact, so its author's pseudonym must
    // surface (product surface shows non-public authors, /u link gated client-side).
    // moderation_status='visible' so a hidden post never leaks its author.
    pgPolicy('profiles_select_for_social_post', {
      as: 'permissive',
      for: 'select',
      to: appRuntimeRole,
      using: sql`NOT ${t.forcedPrivateByAdmin} AND EXISTS (
        SELECT 1 FROM social_posts sp
        WHERE sp.author_id = ${t.userId} AND sp.moderation_status = 'visible'
      )`,
    }),
    // A visible reply is a public signed artifact too, so its author's pseudonym must
    // surface (getPostWithReplies leftJoins it). moderation_status='visible' so a
    // hidden reply never leaks its author. social_post_replies has no RLS.
    pgPolicy('profiles_select_for_post_reply', {
      as: 'permissive',
      for: 'select',
      to: appRuntimeRole,
      using: sql`NOT ${t.forcedPrivateByAdmin} AND EXISTS (
        SELECT 1 FROM social_post_replies spr
        WHERE spr.author_id = ${t.userId} AND spr.moderation_status = 'visible'
      )`,
    }),
    pgPolicy('profiles_admin_bypass', {
      as: 'permissive',
      for: 'all',
      to: appRuntimeRole,
      using: sql`(SELECT auth.role()) = 'admin'`,
      withCheck: sql`(SELECT auth.role()) = 'admin'`,
    }),
  ]
).enableRLS()

export const userDermoProfiles = pgTable(
  'user_dermo_profiles',
  {
    userId: uuid('user_id')
      .primaryKey()
      .references(() => users.id, { onDelete: 'cascade' }),
    skinTypes: text('skin_types').array().$type<SkinType[]>(),
    fitzpatrickType: integer('fitzpatrick_type'),
    skinConcerns: text('skin_concerns').array().notNull().default([]).$type<SkinConcern[]>(),
    privateNotes: text('private_notes'),
    skinTypesPublic: boolean('skin_types_public').notNull().default(false),
    fitzpatrickPublic: boolean('fitzpatrick_public').notNull().default(false),
    skinConcernsPublic: boolean('skin_concerns_public').notNull().default(false),
    // Consent to be matched by the skin-similarity engine. Opt-in, off by default;
    // only effective under the master profile_public gate. Distinct from display flags.
    discoverable: boolean('discoverable').notNull().default(false),
    ...timestamps,
  },
  (t) => [
    check('user_dermo_profiles_fitzpatrick_range', sql`${t.fitzpatrickType} BETWEEN 1 AND 6`),
    // Partial GIN over the opt-in cohort only. Tiny: indexes just the discoverable rows.
    index('user_dermo_profiles_discoverable_concerns_gin')
      .using('gin', t.skinConcerns)
      .where(sql`${t.discoverable}`),
    ...tenantPolicies('user_dermo_profiles', t.userId),
    pgPolicy('user_dermo_profiles_select_public', {
      as: 'permissive',
      for: 'select',
      to: appRuntimeRole,
      using: sql`EXISTS (
        SELECT 1 FROM profiles p
        WHERE p.user_id = ${t.userId}
          AND p.profile_public = TRUE
          AND p.forced_private_by_admin = FALSE
      )`,
    }),
    // Allows reading dermo data on the public reviews surface even when
    // profile_public=false. Mirrors profiles_select_for_public_review. Gate:
    // the user has at least one public visible review, at least one skin flag is
    // on, and their profile has not been force-privated by an admin.
    pgPolicy('user_dermo_profiles_select_for_public_review', {
      as: 'permissive',
      for: 'select',
      to: appRuntimeRole,
      using: sql`(${t.skinTypesPublic} = TRUE OR ${t.fitzpatrickPublic} = TRUE) AND EXISTS (
        SELECT 1 FROM profiles p
        JOIN user_products up ON up.user_id = p.user_id
        JOIN user_product_reviews r ON r.user_product_id = up.id
        WHERE p.user_id = ${t.userId}
          AND NOT p.forced_private_by_admin
          AND r.is_public = TRUE
          AND r.moderation_status = 'visible'
      )`,
    }),
    // Exposes opt-in rows to the similarity engine (ADR-0012). Same
    // master gate as _select_public (profile_public + not force-privated), plus
    // the discoverable consent. No SECURITY DEFINER wrapper: the inner read hits
    // only `profiles`, whose policies never reference user_dermo_profiles, so no
    // recursion cycle (unlike 0067). The engine reads private dermo data through
    // this path and only ever surfaces an ordinal band.
    pgPolicy('user_dermo_profiles_select_discoverable', {
      as: 'permissive',
      for: 'select',
      to: appRuntimeRole,
      using: sql`${t.discoverable} = TRUE AND EXISTS (
        SELECT 1 FROM profiles p
        WHERE p.user_id = ${t.userId}
          AND p.profile_public = TRUE
          AND p.forced_private_by_admin = FALSE
      )`,
    }),
  ]
).enableRLS()

export const refreshTokens = pgTable(
  'refresh_tokens',
  {
    id: uuid('id').primaryKey().default(sql`uuidv7()`),
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    jtiHash: text('jti_hash').notNull(),
    expiresAt: timestamp('expires_at', { withTimezone: true, mode: 'string' }).notNull(),
    revokedAt: timestamp('revoked_at', { withTimezone: true, mode: 'string' }),
    lastUsedAt: timestamp('last_used_at', { withTimezone: true, mode: 'string' }),
    ip: varchar('ip', { length: 45 }),
    userAgent: text('user_agent'),
    createdAt: timestamp('created_at', { withTimezone: true, mode: 'string' })
      .notNull()
      .defaultNow(),
  },
  (t) => [
    uniqueIndex('refresh_tokens_jti_hash_ux').on(t.jtiHash),
    // Partial index: only active (non-revoked) tokens, used by getUserActiveSessions
    index('refresh_tokens_active_user_idx')
      .on(t.userId, t.expiresAt)
      .where(sql`${t.revokedAt} IS NULL`),
    // Used by getUserActiveSessions and revokeAllUserRefreshTokens
    index('refresh_tokens_user_revoked_idx').on(t.userId, t.revokedAt),
    // Used by the cleanup job (expired + revoked tokens)
    index('refresh_tokens_expires_revoked_idx').on(t.expiresAt, t.revokedAt),
    check('revoked_after_created', sql`${t.revokedAt} IS NULL OR ${t.revokedAt} >= ${t.createdAt}`),
    check('expires_in_future', sql`${t.expiresAt} > ${t.createdAt}`),
    // Pre-identity lookup (refresh flow before bindRlsContext is set) goes
    // through auth.find_active_refresh_token (SECURITY DEFINER, see 0041).
    // All other reads/writes are gated by these policies.
    ...tenantPolicies('refresh_tokens', t.userId),
  ]
).enableRLS()

// Safe projection of `users` exposed to app_runtime, excludes password_hash
// and google_sub. Created by migration 0038 (hand-written, .existing() so
// drizzle-kit doesn't try to manage it). Use this for any read that doesn't
// strictly need the secret columns.
export const usersSafe = pgView('users_safe', {
  id: uuid('id').notNull(),
  email: varchar('email', { length: 320 }).notNull(),
  role: userRoleEnum('role').notNull(),
  createdAt: timestamp('created_at', { withTimezone: true, mode: 'string' }).notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true, mode: 'string' }).notNull(),
  emailVerifiedAt: timestamp('email_verified_at', { withTimezone: true, mode: 'string' }),
  deletedAt: timestamp('deleted_at', { withTimezone: true, mode: 'string' }),
  isDemo: boolean('is_demo').notNull(),
  expiresAt: timestamp('expires_at', { withTimezone: true, mode: 'string' }),
}).existing()

export type UserDermoProfileRow = typeof userDermoProfiles.$inferSelect
export type User = typeof users.$inferSelect
export type UserInsert = typeof users.$inferInsert
export type UserSafe = typeof usersSafe.$inferSelect
export type Profile = typeof profiles.$inferSelect
