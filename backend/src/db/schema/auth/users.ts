import type { ProfileLink, SkinConcern, SkinType } from '@habit-tracker/shared'

import { sql } from 'drizzle-orm'
import {
  boolean,
  check,
  index,
  integer,
  jsonb,
  pgEnum,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid,
  varchar,
} from 'drizzle-orm/pg-core'

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

    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true })
      .notNull()
      .defaultNow()
      .$onUpdate(() => new Date()),
    emailVerifiedAt: timestamp('email_verified_at', { withTimezone: true }),
    role: userRoleEnum('role').notNull().default('user'),
    deletedAt: timestamp('deleted_at', { withTimezone: true }),
    isDemo: boolean('is_demo').notNull().default(false),
    expiresAt: timestamp('expires_at', { withTimezone: true }),
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
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    uniqueIndex('profiles_username_ux').on(t.username),
    // Needed for public profile lookup by username (/u/:username)
    index('profiles_username_idx').on(t.username),
  ]
)

export const userDermoProfiles = pgTable('user_dermo_profiles', {
  userId: uuid('user_id')
    .primaryKey()
    .references(() => users.id, { onDelete: 'cascade' }),
  skinTypes: text('skin_types').array().$type<SkinType[]>(),
  fitzpatrickType: integer('fitzpatrick_type'),
  skinConcerns: text('skin_concerns').array().notNull().default([]).$type<SkinConcern[]>(),
  privateNotes: text('private_notes'),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true })
    .notNull()
    .defaultNow()
    .$onUpdate(() => new Date()),
})

export const refreshTokens = pgTable(
  'refresh_tokens',
  {
    id: uuid('id').primaryKey().default(sql`uuidv7()`),
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    jtiHash: text('jti_hash').notNull(),
    expiresAt: timestamp('expires_at', { withTimezone: true }).notNull(),
    revokedAt: timestamp('revoked_at', { withTimezone: true }),
    lastUsedAt: timestamp('last_used_at', { withTimezone: true }),
    ip: varchar('ip', { length: 45 }),
    userAgent: text('user_agent'),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    deletedAt: timestamp('deleted_at', { withTimezone: true }),
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
  ]
)

export type UserDermoProfileRow = typeof userDermoProfiles.$inferSelect
export type User = typeof users.$inferSelect
export type UserInsert = typeof users.$inferInsert
export type Profile = typeof profiles.$inferSelect
