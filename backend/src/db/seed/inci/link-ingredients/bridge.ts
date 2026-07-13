// Bridge: an algo-derm IngredientEvidence back to an aurore ingredient slug.
// Pure — no DB, no IO. The runner resolves a raw INCI token to canonical evidence
// via algo-derm's alias index, then this maps that evidence onto our own taxonomy.
import { normalize } from 'algo-derm'

import { type InciIndex, normalizeInciToken } from '../index'

// Structural subset of algo-derm's IngredientEvidence — only what the bridge reads.
// Keeps this module decoupled from the algo-derm type surface (and trivially testable).
interface EvidenceLike {
  inci: string
  aliases?: string[]
}

/**
 * B2 first (canonical INCI token → slug via the aurore inci index), then B1
 * (humanised-slug word equality) as a fallback. First non-null wins.
 */
export function bridgeEvidenceToSlug(
  evidence: EvidenceLike,
  inciIndex: InciIndex,
  slugByHumanized: Map<string, string>
): string | null {
  const candidates = [evidence.inci, ...(evidence.aliases ?? [])].filter(Boolean)

  for (const c of candidates) {
    const entry = inciIndex.get(normalizeInciToken(c))
    if (entry) return entry.slug
  }

  for (const c of candidates) {
    const slug = slugByHumanized.get(normalize(c))
    if (slug) return slug
  }

  return null
}

/** Reverse map for B1: `normalize('vitamin c')` → `'vitamin-c'`. First slug wins on collision. */
export function buildSlugByHumanized(slugs: Iterable<string>): Map<string, string> {
  const map = new Map<string, string>()
  for (const slug of slugs) {
    const key = normalize(slug.replace(/-/g, ' '))
    if (key && !map.has(key)) map.set(key, slug)
  }
  return map
}
