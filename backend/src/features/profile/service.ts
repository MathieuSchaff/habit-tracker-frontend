import type {
  CriteriaWeights,
  DisplayScale,
  ProfilePublic,
  ProfileUpdateInput,
  UpdateUserPreferencesInput,
} from '@habit-tracker/shared'

import { eq } from 'drizzle-orm'

import { userPreferences } from '../../db/schema/user-preferences'
import { profiles } from '../../db/schema/users'
import type { DB } from '../../db/types'
import type { Profile } from './types'

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
    createdAt: profile.createdAt.toISOString(),
    updatedAt: profile.updatedAt.toISOString(),
  }
}

/**
 * Récupère le profil d'un utilisateur par son ID.
 *
 * @returns Le profil trouvé, ou `null` si inexistant.
 */
export async function getProfile(db: DB, userId: string): Promise<ProfilePublic | null> {
  const [profile] = await db.select().from(profiles).where(eq(profiles.userId, userId)).limit(1)

  return profile ? toProfilePublic(profile) : null
}

/**
 * Met à jour le profil d'un utilisateur (delta update).
 *
 * @remarks
 * Seuls les champs présents dans `data` sont modifiés.
 * Le champ `updatedAt` est automatiquement mis à jour.
 *
 * @returns Le profil mis à jour, ou `null` si le profil n'existe pas.
 */
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
