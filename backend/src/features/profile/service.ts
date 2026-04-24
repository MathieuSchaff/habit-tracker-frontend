import type {
  CriteriaWeights,
  DisplayScale,
  PrivacySettings,
  ProfilePublic,
  ProfileStats,
  ProfileUpdateInput,
  UpdatePrivacySettingsInput,
  UpdateUserPreferencesInput,
  UserDermoProfile,
  UserDermoProfileUpdateInput,
} from '@habit-tracker/shared'

import { count, eq } from 'drizzle-orm'

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
    createdAt: profile.createdAt.toISOString(),
    updatedAt: profile.updatedAt.toISOString(),
  }
}

export async function getProfile(db: DB, userId: string): Promise<ProfilePublic | null> {
  const [profile] = await db.select().from(profiles).where(eq(profiles.userId, userId)).limit(1)

  return profile ? toProfilePublic(profile) : null
}

export async function updateProfile(
  db: DB,
  userId: string,
  data: ProfileUpdateInput
): Promise<ProfilePublic | null> {
  const [profile] = await db
    .update(profiles)
    .set({ ...data, updatedAt: new Date() })
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
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
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
        updatedAt: new Date(),
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
      updatedAt: new Date().toISOString(),
    }
  }

  return {
    displayScale: row.displayScale,
    criteriaWeights: row.criteriaWeights,
    updatedAt: row.updatedAt.toISOString(),
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
        updatedAt: new Date(),
      },
    })
    .returning()

  return {
    displayScale: row.displayScale,
    criteriaWeights: row.criteriaWeights,
    updatedAt: row.updatedAt.toISOString(),
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
  const deletedUser = await db.delete(users).where(eq(users.id, userId)).returning()
  return deletedUser
}

export async function getPrivacySettings(db: DB, userId: string): Promise<PrivacySettings> {
  const [profile] = await db
    .select({ profilePublic: profiles.profilePublic })
    .from(profiles)
    .where(eq(profiles.userId, userId))
    .limit(1)

  const [prefs] = await db
    .select({ aiConsent: userPreferences.aiConsent })
    .from(userPreferences)
    .where(eq(userPreferences.userId, userId))
    .limit(1)

  return {
    profilePublic: profile?.profilePublic ?? false,
    aiConsent: prefs?.aiConsent ?? false,
  }
}

export async function updatePrivacySettings(
  db: DB,
  userId: string,
  data: UpdatePrivacySettingsInput
): Promise<PrivacySettings | null> {
  let profilePublic: boolean | undefined

  if (data.profilePublic !== undefined) {
    const [updated] = await db
      .update(profiles)
      .set({ profilePublic: data.profilePublic, updatedAt: new Date() })
      .where(eq(profiles.userId, userId))
      .returning({ profilePublic: profiles.profilePublic })

    // null signals the caller that the profile row was not found
    if (!updated) return null
    profilePublic = updated.profilePublic
  }

  let aiConsent: boolean | undefined

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
        set: { aiConsent: data.aiConsent, updatedAt: new Date() },
      })

    aiConsent = data.aiConsent
  }

  // Read only the fields that were NOT updated (to get their current values)
  const current = await getPrivacySettings(db, userId)

  return {
    profilePublic: profilePublic ?? current.profilePublic,
    aiConsent: aiConsent ?? current.aiConsent,
  }
}
