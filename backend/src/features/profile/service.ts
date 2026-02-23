import type { ProfilePublic, ProfileUpdateInput } from '@habit-tracker/shared'

import { eq } from 'drizzle-orm'

import { profiles } from '../../db/schema/users'
import type { DB } from '../../db/types'
import type { Profile } from './types'

/**
 * Convertit un profil DB (dates en `Date`) en profil public (dates en ISO string).
 *
 * @remarks
 * Nécessaire car JSON.stringify sérialise les `Date` en string,
 * mais TypeScript ne le sait pas — cette conversion rend le type explicite.
 */
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
