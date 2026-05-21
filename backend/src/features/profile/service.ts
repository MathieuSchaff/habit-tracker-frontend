import type {
  CriteriaWeights,
  DisplayScale,
  PrivacySettings,
  ProfilePublic,
  ProfileStats,
  ProfileUpdateInput,
  PublicProfileView,
  UpdatePrivacySettingsInput,
  UpdateUserPreferencesInput,
  UserDermoProfile,
  UserDermoProfileUpdateInput,
} from '@habit-tracker/shared'

import { and, count, eq } from 'drizzle-orm'

import type { Database, DB } from '../../db'
import { userPreferences } from '../../db/schema/auth/user-preferences'
import { userProducts } from '../../db/schema/user-products'
import {
  type Profile,
  profiles,
  type UserDermoProfileRow,
  userDermoProfiles,
  users,
} from '../../db/schema/users'
import { nowISO } from '../../utils/dates'

const DEFAULT_CRITERIA_WEIGHTS: CriteriaWeights = {
  tolerance: 1,
  efficacy: 1,
  sensoriality: 1,
  stability: 1,
  mixability: 1,
  valueForMoney: 1,
}

const DEFAULT_DISPLAY_SCALE: DisplayScale = 'out_of_20'

export function toProfilePublic(profile: Profile): ProfilePublic {
  return {
    userId: profile.userId,
    username: profile.username,
    bio: profile.bio,
    avatarUrl: profile.avatarUrl,
    links: profile.links,
    createdAt: profile.createdAt,
    updatedAt: profile.updatedAt,
  }
}

export async function getProfile(db: DB, userId: string): Promise<ProfilePublic | null> {
  const [profile] = await db.select().from(profiles).where(eq(profiles.userId, userId)).limit(1)

  return profile ? toProfilePublic(profile) : null
}

// Explicit whitelist — never spread `data` straight into the UPDATE. RLS lets
// the owner write any column of their own profile row (tenant_isolation), so
// the API layer is the only thing between an attacker and the moderation
// columns (forcedPrivateByAdmin, moderatedBy, …). profileUpdateSchema is
// .strict() today but a future loosen-up must not become a silent escalation.
export async function updateProfile(
  db: DB,
  userId: string,
  data: ProfileUpdateInput
): Promise<ProfilePublic | null> {
  const updates: Partial<Pick<Profile, 'username' | 'bio' | 'avatarUrl' | 'links'>> = {}
  if (data.username !== undefined) updates.username = data.username
  if (data.bio !== undefined) updates.bio = data.bio
  if (data.avatarUrl !== undefined) updates.avatarUrl = data.avatarUrl
  if (data.links !== undefined) updates.links = data.links

  if (Object.keys(updates).length === 0) {
    const [current] = await db.select().from(profiles).where(eq(profiles.userId, userId)).limit(1)
    return current ? toProfilePublic(current) : null
  }

  const [profile] = await db
    .update(profiles)
    .set({ ...updates, updatedAt: nowISO() })
    .where(eq(profiles.userId, userId))
    .returning()
  return profile ? toProfilePublic(profile) : null
}

function toDermoProfile(row: UserDermoProfileRow): UserDermoProfile {
  return {
    userId: row.userId,
    skinTypes: row.skinTypes as UserDermoProfile['skinTypes'],
    fitzpatrickType: row.fitzpatrickType,
    skinConcerns: (row.skinConcerns ?? []) as UserDermoProfile['skinConcerns'],
    privateNotes: row.privateNotes,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  }
}

export async function getDermoProfile(db: DB, userId: string): Promise<UserDermoProfile | null> {
  const [row] = await db
    .select()
    .from(userDermoProfiles)
    .where(eq(userDermoProfiles.userId, userId))
    .limit(1)

  return row ? toDermoProfile(row) : null
}

export async function upsertDermoProfile(
  db: DB,
  userId: string,
  data: UserDermoProfileUpdateInput
): Promise<UserDermoProfile> {
  const [row] = await db
    .insert(userDermoProfiles)
    .values({
      userId,
      skinTypes: data.skinTypes ?? null,
      fitzpatrickType: data.fitzpatrickType ?? null,
      skinConcerns: data.skinConcerns ?? [],
      privateNotes: data.privateNotes ?? null,
    })
    .onConflictDoUpdate({
      target: userDermoProfiles.userId,
      set: {
        ...(data.skinTypes !== undefined ? { skinTypes: data.skinTypes } : {}),
        ...(data.fitzpatrickType !== undefined ? { fitzpatrickType: data.fitzpatrickType } : {}),
        ...(data.skinConcerns !== undefined ? { skinConcerns: data.skinConcerns } : {}),
        ...(data.privateNotes !== undefined ? { privateNotes: data.privateNotes } : {}),
        updatedAt: nowISO(),
      },
    })
    .returning()

  return toDermoProfile(row)
}

export async function getUserPreferences(db: DB, userId: string) {
  const [row] = await db
    .select()
    .from(userPreferences)
    .where(eq(userPreferences.userId, userId))
    .limit(1)

  if (!row) {
    return {
      displayScale: DEFAULT_DISPLAY_SCALE,
      criteriaWeights: DEFAULT_CRITERIA_WEIGHTS,
      updatedAt: nowISO(),
    }
  }

  return {
    displayScale: row.displayScale,
    criteriaWeights: row.criteriaWeights,
    updatedAt: row.updatedAt,
  }
}

export async function updateUserPreferences(
  db: DB,
  userId: string,
  data: UpdateUserPreferencesInput
) {
  const [existing] = await db
    .select()
    .from(userPreferences)
    .where(eq(userPreferences.userId, userId))
    .limit(1)

  // We merge the old weights with the new ones so we don't lose the ones that are not in the input
  const currentWeights = existing?.criteriaWeights ?? DEFAULT_CRITERIA_WEIGHTS
  const mergedWeights = data.criteriaWeights
    ? { ...currentWeights, ...data.criteriaWeights }
    : currentWeights

  const [row] = await db
    .insert(userPreferences)
    .values({
      userId,
      displayScale: data.displayScale ?? existing?.displayScale ?? DEFAULT_DISPLAY_SCALE,
      criteriaWeights: mergedWeights,
    })
    .onConflictDoUpdate({
      target: userPreferences.userId,
      set: {
        ...(data.displayScale ? { displayScale: data.displayScale } : {}),
        criteriaWeights: mergedWeights,
        updatedAt: nowISO(),
      },
    })
    .returning()

  return {
    displayScale: row.displayScale,
    criteriaWeights: row.criteriaWeights,
    updatedAt: row.updatedAt,
  }
}

export async function getProfileStats(db: Database, userId: string): Promise<ProfileStats> {
  const [productCount] = await db
    .select({ count: count() })
    .from(userProducts)
    .where(eq(userProducts.userId, userId))

  return {
    totalHabits: 0,
    totalChecks: 0,
    bestStreak: 0,
    totalProducts: productCount?.count ?? 0,
  }
}

export async function deleteUser(db: Database, userId: string) {
  const deletedUser = await db.delete(users).where(eq(users.id, userId)).returning({ id: users.id })
  return deletedUser
}

const PROFILE_FLAG_KEYS = ['profilePublic', 'bioPublic', 'avatarPublic', 'linksPublic'] as const
const DERMO_FLAG_KEYS = ['skinTypesPublic', 'fitzpatrickPublic', 'skinConcernsPublic'] as const

export async function getPrivacySettings(db: DB, userId: string): Promise<PrivacySettings> {
  const [profile] = await db
    .select({
      profilePublic: profiles.profilePublic,
      bioPublic: profiles.bioPublic,
      avatarPublic: profiles.avatarPublic,
      linksPublic: profiles.linksPublic,
    })
    .from(profiles)
    .where(eq(profiles.userId, userId))
    .limit(1)

  const [dermo] = await db
    .select({
      skinTypesPublic: userDermoProfiles.skinTypesPublic,
      fitzpatrickPublic: userDermoProfiles.fitzpatrickPublic,
      skinConcernsPublic: userDermoProfiles.skinConcernsPublic,
    })
    .from(userDermoProfiles)
    .where(eq(userDermoProfiles.userId, userId))
    .limit(1)

  const [prefs] = await db
    .select({ aiConsent: userPreferences.aiConsent })
    .from(userPreferences)
    .where(eq(userPreferences.userId, userId))
    .limit(1)

  return {
    profilePublic: profile?.profilePublic ?? false,
    bioPublic: profile?.bioPublic ?? false,
    avatarPublic: profile?.avatarPublic ?? false,
    linksPublic: profile?.linksPublic ?? false,
    skinTypesPublic: dermo?.skinTypesPublic ?? false,
    fitzpatrickPublic: dermo?.fitzpatrickPublic ?? false,
    skinConcernsPublic: dermo?.skinConcernsPublic ?? false,
    aiConsent: prefs?.aiConsent ?? false,
  }
}

export async function updatePrivacySettings(
  db: DB,
  userId: string,
  data: UpdatePrivacySettingsInput
): Promise<PrivacySettings | null> {
  const profileUpdates: Record<string, boolean> = {}
  for (const key of PROFILE_FLAG_KEYS) {
    if (data[key] !== undefined) profileUpdates[key] = data[key] as boolean
  }

  if (Object.keys(profileUpdates).length > 0) {
    const [updated] = await db
      .update(profiles)
      .set({ ...profileUpdates, updatedAt: nowISO() })
      .where(eq(profiles.userId, userId))
      .returning({ userId: profiles.userId })

    // null signals the caller that the profile row was not found
    if (!updated) return null
  }

  const dermoUpdates: Record<string, boolean> = {}
  for (const key of DERMO_FLAG_KEYS) {
    if (data[key] !== undefined) dermoUpdates[key] = data[key] as boolean
  }

  if (Object.keys(dermoUpdates).length > 0) {
    // Upsert: dermo row may not exist yet (user hasn't filled skin profile).
    // Store the visibility intent now; actual data fields stay null until the
    // user fills them. Projection in getPublicProfile already handles null.
    await db
      .insert(userDermoProfiles)
      .values({ userId, ...dermoUpdates })
      .onConflictDoUpdate({
        target: userDermoProfiles.userId,
        set: { ...dermoUpdates, updatedAt: nowISO() },
      })
  }

  if (data.aiConsent !== undefined) {
    const [existing] = await db
      .select({
        displayScale: userPreferences.displayScale,
        criteriaWeights: userPreferences.criteriaWeights,
      })
      .from(userPreferences)
      .where(eq(userPreferences.userId, userId))
      .limit(1)

    await db
      .insert(userPreferences)
      .values({
        userId,
        displayScale: existing?.displayScale ?? DEFAULT_DISPLAY_SCALE,
        criteriaWeights: existing?.criteriaWeights ?? DEFAULT_CRITERIA_WEIGHTS,
        aiConsent: data.aiConsent,
      })
      .onConflictDoUpdate({
        target: userPreferences.userId,
        set: { aiConsent: data.aiConsent, updatedAt: nowISO() },
      })
  }

  return getPrivacySettings(db, userId)
}

// Projects a public profile view by username, masking each field whose
// `*_public` flag is false. Master `profile_public` gate is enforced by RLS:
// non-public rows are invisible to app_runtime. Returns null when the username
// is unknown or the profile is not public.
export async function getPublicProfileByUsername(
  db: DB,
  username: string
): Promise<PublicProfileView | null> {
  const [row] = await db
    .select({
      username: profiles.username,
      bio: profiles.bio,
      bioPublic: profiles.bioPublic,
      avatarUrl: profiles.avatarUrl,
      avatarPublic: profiles.avatarPublic,
      links: profiles.links,
      linksPublic: profiles.linksPublic,
      skinTypes: userDermoProfiles.skinTypes,
      skinTypesPublic: userDermoProfiles.skinTypesPublic,
      fitzpatrickType: userDermoProfiles.fitzpatrickType,
      fitzpatrickPublic: userDermoProfiles.fitzpatrickPublic,
      skinConcerns: userDermoProfiles.skinConcerns,
      skinConcernsPublic: userDermoProfiles.skinConcernsPublic,
    })
    .from(profiles)
    .leftJoin(userDermoProfiles, eq(profiles.userId, userDermoProfiles.userId))
    .where(
      and(
        eq(profiles.username, username),
        eq(profiles.profilePublic, true),
        eq(profiles.forcedPrivateByAdmin, false)
      )
    )
    .limit(1)

  if (!row || !row.username) return null

  return {
    username: row.username,
    bio: row.bioPublic ? row.bio : null,
    avatarUrl: row.avatarPublic ? row.avatarUrl : null,
    links: row.linksPublic ? row.links : null,
    skinTypes: row.skinTypesPublic
      ? ((row.skinTypes ?? []) as PublicProfileView['skinTypes'])
      : null,
    fitzpatrickType: row.fitzpatrickPublic ? row.fitzpatrickType : null,
    skinConcerns: row.skinConcernsPublic
      ? ((row.skinConcerns ?? []) as PublicProfileView['skinConcerns'])
      : null,
  }
}
