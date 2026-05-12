/**
 * inci-index.ts — INCI-token → slug index for auto-filling candidate keyIngredients.
 *
 * Two parsing sources, first-write wins on collisions:
 *   1. ingredientData[].content markdown — `## INCI\n**Token**` block
 *   2. data/ingredients/*&#47;ingredient-slugs.ts — inline `// [INCI:] Token | desc` comments
 *
 * Excipient blocklist filters out tokens that are too common to be informative
 * (water, glycerin, denat. alcohol, EDTA…). Even when present in the index sources,
 * blocked tokens never make it into the result of inferKeyIngredients.
 */

import { readFileSync } from 'node:fs'
import { join } from 'node:path'

import { ingredientData } from '../data/ingredients'
import { INGREDIENT_SLUGS } from '../data/ingredients/ingredient-slugs'

// Entries are normalised at module load via normalizeInciToken to match real
// INCI conventions (dashes, slashes, parens, accents). Source list keeps the
// original INCI orthography so it stays grep-friendly.
const EXCIPIENT_BLOCKLIST_SOURCE: string[] = [
  // Solvents / pH adjusters
  'Aqua',
  'Water',
  'Eau',
  'Glycerin',
  'Glycerine',
  'Alcohol',
  'Alcohol Denat',
  'Denatured Alcohol',
  'Ethanol',
  'Butylene Glycol',
  'Propylene Glycol',
  'Pentylene Glycol',
  'Parfum',
  'Fragrance',
  'Phenoxyethanol',
  'Benzyl Alcohol',
  'Ethylhexylglycerin',
  'Citric Acid',
  'Sodium Hydroxide',
  'Triethanolamine',
  'Disodium EDTA',
  'EDTA',
  'Tetrasodium EDTA',
  'Trisodium EDTA',
  'BHT',
  'BHA',
  'Sodium Chloride',
  'Potassium Sorbate',
  'Sodium Benzoate',
  // Texture / rheology polymers
  'Xanthan Gum',
  'Carbomer',
  'Sclerotium Gum',
  'Hydroxyethylcellulose',
  'Hydroxypropyl Methylcellulose',
  'Hydroxypropyl Cellulose',
  'Acrylates Copolymer',
  'Acrylates/C10-30 Alkyl Acrylate Crosspolymer',
  'Ammonium Acryloyldimethyltaurate/VP Copolymer',
  // Silicones
  'Dimethicone',
  'Dimethiconol',
  'Cyclomethicone',
  'Cyclopentasiloxane',
  'Cyclohexasiloxane',
  'Phenyl Trimethicone',
  // Fatty alcohols / emulsifying waxes
  'Cetearyl Alcohol',
  'Cetyl Alcohol',
  'Stearyl Alcohol',
  'Behenyl Alcohol',
  'Arachidyl Alcohol',
  // Common emulsifiers
  'Glyceryl Stearate',
  'Glyceryl Stearate SE',
  'PEG-100 Stearate',
  'PEG-40 Stearate',
  'PEG-40 Hydrogenated Castor Oil',
  'PEG-60 Hydrogenated Castor Oil',
  'Cetearyl Glucoside',
  'Arachidyl Glucoside',
  'Polysorbate 20',
  'Polysorbate 60',
  'Polysorbate 80',
  'Sorbitan Stearate',
  'Sorbitan Olivate',
  // Bland emollient oils / esters
  'Mineral Oil',
  'Paraffinum Liquidum',
  'Petrolatum',
  'Ethylhexyl Palmitate',
  'Isopropyl Myristate',
  'Isopropyl Palmitate',
  'Caprylic/Capric Triglyceride',
  'Coco-Caprylate',
  'Coco-Caprylate/Caprate',
  'Octyldodecanol',
  'C12-15 Alkyl Benzoate',
  'C13-14 Isoparaffin',
  // Mild surfactants present in nearly every wash/shampoo
  'Cocamidopropyl Betaine',
  'Sodium Cocoamphoacetate',
  'Disodium Cocoamphodiacetate',
  'Decyl Glucoside',
  'Coco-Glucoside',
  'Lauryl Glucoside',
  'Caprylyl/Capryl Glucoside',
  // Generic shampoo conditioning polymers (cationic)
  'Polyquaternium-10',
  'Polyquaternium-7',
  'Polyquaternium-4',
  'Polyquaternium-22',
  'Guar Hydroxypropyltrimonium Chloride',
  // Vitamin E / derivatives — almost always trace-level stabilisers
  'Tocopherol',
  'Tocopheryl Acetate',
  'Tocopheryl Glucoside',
]

export const EXCIPIENT_BLOCKLIST = new Set<string>(
  EXCIPIENT_BLOCKLIST_SOURCE.map((s) => normalizeInciToken(s))
)

export type IngredientDomain = 'skincare' | 'haircare' | 'dental' | 'supplements'

export interface InciIndexEntry {
  slug: string
  /** Source file domain. Lets a per-product call exclude foreign-domain slugs. */
  domain: IngredientDomain
}

export type InciIndex = Map<string, InciIndexEntry>

const INGREDIENTS_ROOT = join(import.meta.dir, '..', '..', 'data', 'ingredients')

const SLUG_FILES: Array<{ rel: string; domain: IngredientDomain }> = [
  { rel: 'skincare/ingredient-slugs.ts', domain: 'skincare' },
  { rel: 'haircare/ingredient-slugs.ts', domain: 'haircare' },
  { rel: 'dental/ingredient-slugs.ts', domain: 'dental' },
  { rel: 'supplements/ingredient-slugs.ts', domain: 'supplements' },
]

/**
 * For a given product category, which ingredient domains should be considered when
 * inferring keyIngredients. Skincare is a generic base — included for non-skincare
 * categories so shared actives (vitamins, soothing extracts) still match. Bodycare and
 * solaire ride the skincare ingredient taxonomy; their candidates only match skincare slugs.
 */
const CATEGORY_DOMAIN_ALLOWLIST: Record<string, IngredientDomain[]> = {
  skincare: ['skincare'],
  bodycare: ['skincare'],
  solaire: ['skincare'],
  haircare: ['haircare', 'skincare'],
  dental: ['dental', 'skincare'],
  complement: ['supplements', 'skincare'],
}

export function normalizeInciToken(s: string): string {
  return s
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/\([^)]*\)/g, '')
    .replace(/\s+/g, ' ')
    .trim()
    .toUpperCase()
}

/** Pull tokens out of a `## INCI` markdown section. Returns raw (non-normalized) strings. */
export function parseInciFromContent(content: string): string[] {
  const lines = content.split('\n')
  const blockLines: string[] = []
  let inBlock = false
  for (const line of lines) {
    const trim = line.trim()
    if (/^##\s+INCI\b/i.test(trim)) {
      inBlock = true
      continue
    }
    if (!inBlock) continue
    if (/^##\s/.test(trim) || trim === '---') break
    blockLines.push(line)
  }
  if (blockLines.length === 0) return []

  const block = blockLines.join('\n')
  const boldTokens = [...block.matchAll(/\*\*([^*\n]+?)\*\*/g)].map((m) => m[1])

  let candidates: string[]
  if (boldTokens.length > 0) {
    candidates = boldTokens
  } else {
    const firstLine = blockLines.map((l) => l.trim().replace(/[`,]/g, '')).find(Boolean)
    candidates = firstLine ? [firstLine] : []
  }

  return candidates
    .flatMap((c) => c.split(/\s+ou\s+|\s*\/\s*|,/i))
    .map((t) => t.trim())
    .filter(Boolean)
}

/** Parse `SLUG_KEY: 'slug-value', // [INCI:] Token / Token | desc`. Returns null when format unfamiliar. */
export function parseInciFromSlugLine(line: string): { slug: string; tokens: string[] } | null {
  const m = line.match(/^\s*([A-Z][A-Z0-9_]*)\s*:\s*['"]([^'"]+)['"]\s*,\s*\/\/\s*(.+?)\s*$/)
  if (!m) return null

  const slug = m[2]
  const comment = m[3]

  let inciSegment = comment
  if (/^INCI:\s*/i.test(comment)) {
    inciSegment = comment.replace(/^INCI:\s*/i, '')
  }
  const pipe = inciSegment.indexOf('|')
  if (pipe >= 0) inciSegment = inciSegment.slice(0, pipe)
  inciSegment = inciSegment.trim()

  if (!inciSegment) return null
  if (!/^[A-Z]/.test(inciSegment)) return null
  // Reject French descriptors: any apostrophe variant or any lowercase-starting word
  // that isn't a recognised INCI connector.
  if (/['']/.test(inciSegment)) return null

  const allowedLowercase = new Set(['or', 'and'])
  const words = inciSegment.split(/\s+/).filter(Boolean)
  for (const w of words) {
    const cleaned = w.replace(/[(),./&-]/g, '')
    if (!cleaned) continue
    if (/^[a-z]/.test(cleaned) && !allowedLowercase.has(cleaned.toLowerCase())) return null
  }

  const tokens = inciSegment
    .split(/\s+ou\s+|\s*\/\s*|,/i)
    .map((t) => t.trim())
    .filter(Boolean)

  return { slug, tokens }
}

export function buildInciIndex(): InciIndex {
  const index: InciIndex = new Map()
  const validSlugs = new Set<string>(Object.values(INGREDIENT_SLUGS))

  const add = (rawToken: string, slug: string, domain: IngredientDomain): void => {
    if (!validSlugs.has(slug)) return
    const norm = normalizeInciToken(rawToken)
    if (norm.length < 2) return
    if (!/^[A-Z]/.test(norm)) return
    if (EXCIPIENT_BLOCKLIST.has(norm)) return
    if (!index.has(norm)) index.set(norm, { slug, domain })
  }

  // Source 1: slug-file inline comments first — explicit `INCI:` prefix is the most
  // predictable signal, and the file order (skincare → haircare → dental → supplements)
  // resolves shared tokens like NIACINAMIDE to the canonical skincare slug rather than
  // a domain-suffixed variant (niacinamide-hair, etc.).
  for (const { rel, domain } of SLUG_FILES) {
    const path = join(INGREDIENTS_ROOT, rel)
    let text: string
    try {
      text = readFileSync(path, 'utf-8')
    } catch {
      continue
    }
    for (const line of text.split('\n')) {
      const parsed = parseInciFromSlugLine(line)
      if (!parsed) continue
      for (const tok of parsed.tokens) add(tok, parsed.slug, domain)
    }
  }

  // Source 2: markdown `## INCI` blocks fill any token the slug-file pass missed.
  // ingredientData lives under data/ingredients/; the type field carries the domain
  // (skincare/haircare/dental/supplement). Map `supplement` → `supplements` to align
  // with the SLUG_FILES key — file dir is plural, ingredient.type is singular.
  for (const ing of ingredientData) {
    const rawType = (ing as { type?: string }).type
    const domain: IngredientDomain =
      rawType === 'haircare' || rawType === 'dental'
        ? rawType
        : rawType === 'supplement'
          ? 'supplements'
          : 'skincare'
    for (const tok of parseInciFromContent(ing.content)) add(tok, ing.slug, domain)
  }

  return index
}

export function getDomainAllowlist(category: string | undefined): Set<IngredientDomain> | null {
  if (!category) return null
  const list = CATEGORY_DOMAIN_ALLOWLIST[category]
  return list ? new Set(list) : null
}

export interface InferKeyIngredientsOptions {
  max?: number
  /** Product category (skincare/haircare/…). Drops index entries from foreign domains. */
  candidateCategory?: string
}

/** Match each comma-separated token in `inci` against the index. Order = INCI order. */
export function inferKeyIngredients(
  inci: string,
  index: InciIndex,
  options: InferKeyIngredientsOptions = {}
): string[] {
  const max = options.max ?? 8
  if (!inci) return []

  const allowed = getDomainAllowlist(options.candidateCategory)

  const tokens = inci.split(/[,;]/).map(normalizeInciToken).filter(Boolean)

  const seen = new Set<string>()
  const result: string[] = []
  for (const tok of tokens) {
    if (EXCIPIENT_BLOCKLIST.has(tok)) continue
    const entry = index.get(tok)
    if (!entry || seen.has(entry.slug)) continue
    if (allowed && !allowed.has(entry.domain)) continue
    seen.add(entry.slug)
    result.push(entry.slug)
    if (result.length >= max) break
  }
  return result
}
