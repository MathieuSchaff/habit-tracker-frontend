import { pgTable, uuid, text, timestamp, index, uniqueIndex, varchar } from 'drizzle-orm/pg-core'

// password_hash nullable > car on peut se connecter avec google  ( à faire)
// google_sub nullable > identifiant Google
export const users = pgTable(
  'users',
  {
    id: uuid('id').defaultRandom().primaryKey(),

    // Email doit être NOT NULL et unique (sinon doublons)
    email: varchar('email', { length: 320 }).notNull(),

    // Hash Argon2 du mot de passe.
    // Nullable => si user créé via Google (sans mot de passe au départ)
    passwordHash: text('password_hash'),

    // "sub" Google (subject) = identifiant stable côté Google.
    // Nullable => seulement rempli si login Google utilisé.
    googleSub: text('google_sub'),

    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),

    updatedAt: timestamp('updated_at', { withTimezone: true })
      .notNull()
      .defaultNow()
      .$onUpdate(() => new Date()),
  },
  (t) => [
    // Empêche 2 comptes avec le même email
    uniqueIndex('users_email_unique').on(t.email),

    // Empêche 2 users liés au même compte Google
    uniqueIndex('users_google_sub_ux').on(t.googleSub),

    // Utile pour "liste des derniers inscrits" / tri / pagination par date
    index('users_created_at_idx').on(t.createdAt),
  ]
)

// profiles c'est pour l'afichage surtout
export const profiles = pgTable(
  'profiles',
  {
    // 1 profile par user (PK = user_id)
    userId: uuid('user_id')
      .primaryKey()
      .references(() => users.id, { onDelete: 'cascade' }),

    // Pseudo affiché.
    username: varchar('username', { length: 32 }),

    // ptionnel: avatar bio

    avatarUrl: text('avatar_url'),
    bio: text('bio'),

    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    // pseudo unique
    uniqueIndex('profiles_username_ux').on(t.username),

    // Utile si on cherches par username (page publique /u/:username)
    index('profiles_username_idx').on(t.username),
  ]
)

export const sessions = pgTable(
  'sessions',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    // Hash du token sid (ex sha256).
    // Unique => une session = un token
    sidHash: text('sid_hash').notNull(),

    // Session appartient à un user
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    expiresAt: timestamp('expires_at', { withTimezone: true }).notNull(),
    revokedAt: timestamp('revoked_at', { withTimezone: true }),
    lastSeenAt: timestamp('last_seen_at', { withTimezone: true }),
    ip: varchar('ip', { length: 64 }),
    userAgent: text('user_agent'),
  },
  (t) => [
    uniqueIndex('sessions_sid_hash_ux').on(t.sidHash),
    index('sessions_user_id_idx').on(t.userId),
    index('sessions_expires_at_idx').on(t.expiresAt),
  ]
)
