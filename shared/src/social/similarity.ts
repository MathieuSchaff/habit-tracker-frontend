import { USER_CONCERN_TO_PRODUCT_TAGS } from '../products/user-concern-bridge'
import type { SkinConcern, SkinType } from '../profile'

// Skin similarity as a lens to find "people like me" (#1). Three sub-signals,
// composited into an INTERNAL score used only to rank; the surfaced output is
// always an ordinal band, never a number (#1 anti-"4.5 stars" guard).

// Matched subset of UserDermoProfile — the metric needs only these 3 axes, so
// it takes a structural shape rather than the full entity (decoupled from
// userId / notes / timestamps).
export type SkinSimilarityInput = {
  skinConcerns: readonly SkinConcern[]
  skinTypes: readonly SkinType[] | null
  fitzpatrickType: number | null
}

export type SimilarityBand = 'tres-proche' | 'proche' | 'eloigne'

// Concerns dominate, skin type secondary, Fitzpatrick tertiary (#1). Sum = 1
// so a fully-present score stays in [0,1].
export const SIMILARITY_WEIGHTS = {
  concern: 0.6,
  skinType: 0.25,
  fitzpatrick: 0.15,
} as const

// Band cutoffs on the raw score. `tresProche` is held strictly above
// (skinType + fitzpatrick) weight (0.4) so the top band is UNREACHABLE without
// a shared concern bucket: "très proche" always means a shared skin problem,
// never merely a matching phototype.
export const BAND_THRESHOLDS = {
  tresProche: 0.5,
  proche: 0.25,
} as const

// Fitzpatrick spans 1..6 → widest gap is 5. Ordinal distance, not set overlap.
const FITZ_MAX_DELTA = 5

// Project the 22 user concerns onto the ~12 clinical buckets via the existing
// drift table — read-only on the table, NOT resolveAvoidSlugs' avoidance
// semantics (#1). The family collapse comes for free: anti-rougeurs / rosacee
// / couperose / flushs all land on `rougeurs-vasculaires`, so two people who
// named the condition differently still match.
export function projectConcernsToBuckets(concerns: readonly SkinConcern[]): Set<string> {
  const buckets = new Set<string>()
  for (const concern of concerns) {
    const mapped = USER_CONCERN_TO_PRODUCT_TAGS[concern]
    if (!mapped) continue
    for (const bucket of mapped) buckets.add(bucket)
  }
  return buckets
}

function jaccard(a: ReadonlySet<string>, b: ReadonlySet<string>): number {
  if (a.size === 0 && b.size === 0) return 0
  let intersection = 0
  for (const x of a) if (b.has(x)) intersection++
  const union = a.size + b.size - intersection
  return union === 0 ? 0 : intersection / union
}

// Raw composite in [0,1]. INTERNAL ONLY — ranks, never displays (#1). A missing
// Fitzpatrick on either side drops that component and renormalizes over the
// present weights, so absent data reads as neutral rather than a penalty.
export function skinSimilarityScore(a: SkinSimilarityInput, b: SkinSimilarityInput): number {
  const concernSim = jaccard(
    projectConcernsToBuckets(a.skinConcerns),
    projectConcernsToBuckets(b.skinConcerns)
  )
  const typeSim = jaccard(new Set(a.skinTypes ?? []), new Set(b.skinTypes ?? []))

  let weighted = SIMILARITY_WEIGHTS.concern * concernSim + SIMILARITY_WEIGHTS.skinType * typeSim
  let totalWeight = SIMILARITY_WEIGHTS.concern + SIMILARITY_WEIGHTS.skinType

  if (a.fitzpatrickType != null && b.fitzpatrickType != null) {
    const fitzSim = 1 - Math.abs(a.fitzpatrickType - b.fitzpatrickType) / FITZ_MAX_DELTA
    weighted += SIMILARITY_WEIGHTS.fitzpatrick * fitzSim
    totalWeight += SIMILARITY_WEIGHTS.fitzpatrick
  }

  return totalWeight === 0 ? 0 : weighted / totalWeight
}

export function similarityBand(score: number): SimilarityBand {
  if (score >= BAND_THRESHOLDS.tresProche) return 'tres-proche'
  if (score >= BAND_THRESHOLDS.proche) return 'proche'
  return 'eloigne'
}

// Public surface: the ordinal band. The score never leaves the ranking layer.
export function skinSimilarity(a: SkinSimilarityInput, b: SkinSimilarityInput): SimilarityBand {
  return similarityBand(skinSimilarityScore(a, b))
}
