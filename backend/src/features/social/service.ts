import {
  concernsSharingBucket,
  type SimilarityBand,
  type SkinConcern,
  type SkinSimilarityInput,
  similarityBand,
  skinSimilarityScore,
} from '@aurore/shared'

import { and, arrayOverlaps, eq, ne } from 'drizzle-orm'

import type { DB } from '../../db'
import { profiles, userDermoProfiles } from '../../db/schema/auth/users'

export type SimilarProfile = { username: string; band: SimilarityBand }

// Shared core of both the passive ranking (#1) and the active concern search
// (#6). Ranks the discoverable cohort by skin similarity to the viewer; surfaces
// the ordinal band only, never the score (#1 zéro-chiffre). Cross-user reads are
// gated by RLS, but the master gate (discoverable + profile_public +
// NOT force-privated) is also filtered explicitly because the owner pool bypasses
// RLS — same defense-in-depth as getPublicProfileByUsername. The viewer's own row
// is visible via tenant_isolation (self-sim = 1.0) and must be excluded. An
// optional concern set narrows the cohort (bucket-aware, array overlap).
async function rankDiscoverableCohort(
  db: DB,
  viewerUserId: string,
  opts: { concerns?: SkinConcern[] } = {}
): Promise<SimilarProfile[]> {
  const [viewer] = await db
    .select({
      skinConcerns: userDermoProfiles.skinConcerns,
      skinTypes: userDermoProfiles.skinTypes,
      fitzpatrickType: userDermoProfiles.fitzpatrickType,
    })
    .from(userDermoProfiles)
    .where(eq(userDermoProfiles.userId, viewerUserId))
    .limit(1)

  // No skin profile → nothing to rank against.
  if (!viewer) return []

  const viewerInput: SkinSimilarityInput = {
    skinConcerns: viewer.skinConcerns ?? [],
    skinTypes: viewer.skinTypes,
    fitzpatrickType: viewer.fitzpatrickType,
  }

  const filters = [
    eq(userDermoProfiles.discoverable, true),
    eq(profiles.profilePublic, true),
    eq(profiles.forcedPrivateByAdmin, false),
    ne(userDermoProfiles.userId, viewerUserId),
  ]
  if (opts.concerns) {
    filters.push(arrayOverlaps(userDermoProfiles.skinConcerns, opts.concerns))
  }

  const candidates = await db
    .select({
      username: profiles.username,
      skinConcerns: userDermoProfiles.skinConcerns,
      skinTypes: userDermoProfiles.skinTypes,
      fitzpatrickType: userDermoProfiles.fitzpatrickType,
    })
    .from(userDermoProfiles)
    .innerJoin(profiles, eq(profiles.userId, userDermoProfiles.userId))
    .where(and(...filters))

  return (
    candidates
      .flatMap((candidate) => {
        if (!candidate.username) return []
        const score = skinSimilarityScore(viewerInput, {
          skinConcerns: candidate.skinConcerns ?? [],
          skinTypes: candidate.skinTypes,
          fitzpatrickType: candidate.fitzpatrickType,
        })
        return [{ username: candidate.username, score }]
      })
      // Username tiebreak keeps equal-score peers in a stable, deterministic
      // order (otherwise heap order leaks into the response). Code-point compare,
      // not localeCompare, so the order never depends on the server locale.
      .sort((a, b) => b.score - a.score || (a.username < b.username ? -1 : 1))
      .map(({ username, score }) => ({ username, band: similarityBand(score) }))
      // éloigné never surfaces — only proche / tres-proche are shown, never a
      // negative label (#5 calme). A diverse cohort is mostly éloigné by design.
      .filter((profile) => profile.band !== 'eloigne')
  )
}

// Passive lens (#1): everyone like the viewer, ranked by similarity.
export function rankSimilarProfiles(db: DB, viewerUserId: string): Promise<SimilarProfile[]> {
  return rankDiscoverableCohort(db, viewerUserId)
}

// Active lens (#6): people who share the searched concern's clinical bucket
// (rosacée also finds couperose/flushs), still ranked by similarity to the viewer.
export function searchProfilesByConcern(
  db: DB,
  concern: SkinConcern,
  viewerUserId: string
): Promise<SimilarProfile[]> {
  return rankDiscoverableCohort(db, viewerUserId, { concerns: concernsSharingBucket(concern) })
}
