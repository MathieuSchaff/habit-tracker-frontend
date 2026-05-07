import type { ProfileLink, SkinConcern, SkinType } from '@habit-tracker/shared'

import { sql } from 'drizzle-orm'
import {
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

export const userRoleEnum = pgEnum('user_role', ['user', 'admin'])

export const users = pgTable(
  'users',
  {
    id: uuid('id').primaryKey().default(sql`uuidv7()`),
    email: varchar('email', { length: 320 }).notNull(),

    // Nullable: user can sign up via Google without a password
    passwordHash: text('password_hash'),

    // Stable Google identifier (subject). Null if user never logged in with Google
    googleSub: text('google_sub'),

    createdAt: timestamp('created_at', { withTimezone: true, mode: 'string' }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true, mode: 'string' })
      .notNull()
      .defaultNow()
      .$onUpdate(() => new Date().toISOString()),
    emailVerifiedAt: timestamp('email_verified_at', { withTimezone: true, mode: 'string' }),
    role: userRoleEnum('role').notNull().default('user'),
    deletedAt: timestamp('deleted_at', { withTimezone: true, mode: 'string' }),
    isDemo: boolean('is_demo').notNull().default(false),
    expiresAt: timestamp('expires_at', { withTimezone: true, mode: 'string' }),
  },
  (t) => [
    // Case-insensitive unique email, only for active accounts
    uniqueIndex('users_email_active_unique_idx')
      .on(sql`lower(${t.email})`)
      .where(sql`deleted_at IS NULL`),
    // Partial index: only indexes Google users, keeps it small
    uniqueIndex('users_google_sub_ux')
      .on(t.googleSub)
      .where(sql`google_sub IS NOT NULL`),
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
    createdAt: timestamp('created_at', { withTimezone: true, mode: 'string' }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true, mode: 'string' }).notNull().defaultNow(),
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
      using: sql`${t.profilePublic}`,
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
    createdAt: timestamp('created_at', { withTimezone: true, mode: 'string' }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true, mode: 'string' })
      .notNull()
      .defaultNow()
      .$onUpdate(() => new Date().toISOString()),
  },
  (t) => [
    check('user_dermo_profiles_fitzpatrick_range', sql`${t.fitzpatrickType} BETWEEN 1 AND 6`),
    ...tenantPolicies('user_dermo_profiles', t.userId),
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
    createdAt: timestamp('created_at', { withTimezone: true, mode: 'string' }).notNull().defaultNow(),
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

// Safe projection of `users` exposed to app_runtime — excludes password_hash
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
