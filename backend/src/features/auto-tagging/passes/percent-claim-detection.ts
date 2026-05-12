import { SKINCARE_PRODUCT_TAG_SLUGS, type SkincareProductTagSlug } from '@habit-tracker/shared'

import { normalize, splitINCI } from 'algo-derm'

import { isAlphabeticalINCI, stripMarketingPreamble } from '../lib/ingredient-resolver'

export interface PercentClaimEvidence {
  ingredientSlug: string
  concentrationValue: number
  concentrationUnit: string
}

type ClaimRule = {
  tagSlug: SkincareProductTagSlug
  ingredientSlugs: readonly string[]
  minPct: number
  maxPct: number
}

const CLAIM_RULES: readonly ClaimRule[] = [
  {
    tagSlug: SKINCARE_PRODUCT_TAG_SLUGS.RETINOIDS,
    ingredientSlugs: ['retinol', 'retinal', 'retinaldehyde'],
    minPct: 0.005,
    maxPct: 3,
  },
  {
    tagSlug: SKINCARE_PRODUCT_TAG_SLUGS.BHA,
    ingredientSlugs: ['salicylic-acid', 'betaine-salicylate'],
    minPct: 0.05,
    maxPct: 5,
  },
  {
    tagSlug: SKINCARE_PRODUCT_TAG_SLUGS.AHA,
    ingredientSlugs: ['glycolic-acid', 'lactic-acid', 'mandelic-acid'],
    minPct: 0.2,
    maxPct: 30,
  },
  {
    tagSlug: SKINCARE_PRODUCT_TAG_SLUGS.TYROSINASE_INHIBITORS,
    ingredientSlugs: ['azelaic-acid', 'tranexamic-acid'],
    minPct: 0.5,
    maxPct: 30,
  },
  {
    tagSlug: SKINCARE_PRODUCT_TAG_SLUGS.VITAMIN_C,
    ingredientSlugs: ['ascorbic-acid', 'ethyl-ascorbic-acid', 'sodium-ascorbyl-phosphate'],
    minPct: 0.1,
    maxPct: 40,
  },
] as const

// French marketing vocabulary that signals usage instructions or product
// descriptions mixed into the ingredient list. Targets multi-word phrases to
// avoid matching legit compound INCI like "peau" inside botanical names.
const PROSE_VOCAB =
  /\b(recommandé|recommended|conseils?\b|appliquer|utilisation|conviendra|destiné|adapt[éeas]+\s+aux|idéal\s+pour|aide\s+à|permet\s+de|riche\s+en|grâce\s+à|enrichi\s+en|bienfait|sans\s+rinçage|tous\s+types\s+de\s+peau|peaux?\s+(sèches?|grasses?|mixtes?|sensibles?|matures?|atopiques?))\b/i

// Compound INCI tokens (synonyms in parens) max at ~5-6 words. Tokens with
// 15+ words signal split failure: bullet/period/semicolon separators not
// recognized by splitINCI, multi-product kits concatenated, or encoding
// corruption (e.g. garancia trousse INCI with `?` chars).
const MAX_LEGIT_WORDS_PER_TOKEN = 15

// True only when the cleaned-of-header INCI still contains marketing prose
// or a token whose length signals a failed split. The bare "Ingrédients :"
// prefix on otherwise-clean French derma INCI (Bioderma, Ducray, LRP) is
// NOT fragile: stripMarketingPreamble removes the prefix and the rest
// parses normally.
function hasMarketingPreamble(inci: string): boolean {
  const cleaned = stripMarketingPreamble(inci)
  if (cleaned === inci) return false
  if (PROSE_VOCAB.test(cleaned)) return true
  for (const tok of splitINCI(cleaned)) {
    const words = tok.trim().split(/\s+/).filter(Boolean).length
    if (words >= MAX_LEGIT_WORDS_PER_TOKEN) return true
  }
  return false
}

function looksTruncated(inci: string): boolean {
  return /\.\.\.|…|truncated|inci tronqu/i.test(inci)
}

export function isFragileINCI(inci: string | null | undefined): boolean {
  if (!inci?.trim()) return true
  const cleaned = stripMarketingPreamble(inci)
  const normalized = splitINCI(cleaned).map(normalize).filter(Boolean)
  if (normalized.length === 0) return true
  return hasMarketingPreamble(inci) || looksTruncated(inci) || isAlphabeticalINCI(normalized)
}

function toCanonicalSlug(raw: string): string {
  return raw.trim().toLowerCase()
}

export function detectPercentClaimTags(
  inci: string | null | undefined,
  claims: readonly PercentClaimEvidence[] | undefined
): SkincareProductTagSlug[] {
  if (!claims || claims.length === 0) return []
  if (!isFragileINCI(inci)) return []

  const byTag = new Map<SkincareProductTagSlug, Set<string>>()
  for (const rule of CLAIM_RULES) byTag.set(rule.tagSlug, new Set())

  for (const claim of claims) {
    if (claim.concentrationUnit !== '%') continue
    const value = Number(claim.concentrationValue)
    if (!Number.isFinite(value) || value <= 0) continue
    const slug = toCanonicalSlug(claim.ingredientSlug)
    for (const rule of CLAIM_RULES) {
      if (!rule.ingredientSlugs.includes(slug)) continue
      if (value < rule.minPct || value > rule.maxPct) continue
      byTag.get(rule.tagSlug)?.add(slug)
    }
  }

  const out: SkincareProductTagSlug[] = []
  for (const rule of CLAIM_RULES) {
    const matches = byTag.get(rule.tagSlug)
    if (matches && matches.size > 0) out.push(rule.tagSlug)
  }
  return out
}
