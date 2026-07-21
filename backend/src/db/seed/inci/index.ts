/**
 * inci-index.ts: INCI-token → slug index for auto-filling candidate keyIngredients.
 *
 * Two parsing sources, first-write wins on collisions:
 *   1. ingredientData[].content markdown: `## INCI\n**Token**` block
 *   2. data/ingredients/*&#47;ingredient-slugs.ts: inline `// [INCI:] Token | desc` comments
 *
 * Excipient blocklist filters out tokens that are too common to be informative
 * (water, glycerin, denat. alcohol, EDTA…). buildInciIndex drops them at construction;
 * buildExcipientSlugs rebuilds with includeExcipients to collect the slugs they resolve to.
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
  // Vitamin E derivatives are almost always trace-level stabilisers.
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
}

export type InciIndex = Map<string, InciIndexEntry>

const INGREDIENTS_ROOT = join(import.meta.dir, '..', 'data', 'ingredients')

const SLUG_FILES: Array<{ rel: string; domain: IngredientDomain }> = [
  { rel: 'skincare/ingredient-slugs.ts', domain: 'skincare' },
  { rel: 'haircare/ingredient-slugs.ts', domain: 'haircare' },
  { rel: 'dental/ingredient-slugs.ts', domain: 'dental' },
  { rel: 'supplements/ingredient-slugs.ts', domain: 'supplements' },
]

/**
 * For a given product category, which ingredient domains should be considered when
 * inferring keyIngredients. Skincare is a generic base included for non-skincare
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

// Repair scraper-mangled delimiters before splitINCI (which only splits on commas).
// Entities decode first: the `;` inside `&lt;` must not become a comma.
// `&amp;` decodes last so `&amp;lt;` cannot cascade into a real `<`.
const HTML_ENTITY_DECODES: Array<[RegExp, string]> = [
  [/&lt;/gi, '<'],
  [/&gt;/gi, '>'],
  [/&nbsp;/gi, ' '],
  [/&trade;/gi, '™'],
  [/&reg;/gi, '®'],
  [/&Eacute;/g, 'É'],
  [/&eacute;/g, 'é'],
  [/&Egrave;/g, 'È'],
  [/&egrave;/g, 'è'],
  [/&Agrave;/g, 'À'],
  [/&agrave;/g, 'à'],
  [/&rsquo;/gi, '’'],
  [/&amp;/gi, '&'],
]

const HTML_ENTITY_OR_SEMICOLON = /&(?:#[0-9]+|#x[0-9a-f]+|[a-z][a-z0-9]+);|\s*;\s*/gi

// The dash fold requires two letters on each side (trademark/asterisk markers may
// trail the left side): a digit neighbour is a mangled hyphen (`2-BROMO-2 -NITRO`,
// `C12 - 16`), a single letter a chemical prefix (`P - fenilendiammina`), `[+/-` a
// may-contain marker. Real INCI names never carry a space before a hyphen (`PEG-60`,
// `C10-30`). `repair-and-fold-inci-delimiters-v2.sql` mirrors this for the stored
// column. Keep both in sync.
export interface FoldScraperDelimiterOptions {
  foldListSeparators?: boolean
}

export function foldScraperDelimiters(
  inci: string,
  { foldListSeparators = true }: FoldScraperDelimiterOptions = {}
): string {
  const decoded = HTML_ENTITY_DECODES.reduce((acc, [rx, sub]) => acc.replace(rx, sub), inci)
  if (!foldListSeparators) return decoded

  return decoded
    .replace(HTML_ENTITY_OR_SEMICOLON, (match) => (match.startsWith('&') ? match : ', '))
    .replace(/([A-Za-zÀ-ÿ]{2}[™®*]{0,2})\s+-\s*(?=[A-Za-zÀ-ÿ]{2})/g, '$1, ')
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

export function buildInciIndex(options: { includeExcipients?: boolean } = {}): InciIndex {
  const index: InciIndex = new Map()
  const validSlugs = new Set<string>(Object.values(INGREDIENT_SLUGS))

  const add = (rawToken: string, slug: string): void => {
    if (!validSlugs.has(slug)) return
    const norm = normalizeInciToken(rawToken)
    if (norm.length < 2) return
    if (!/^[A-Z]/.test(norm)) return
    if (!options.includeExcipients && EXCIPIENT_BLOCKLIST.has(norm)) return
    if (!index.has(norm)) index.set(norm, { slug })
  }

  // Source 1: slug-file inline comments first. The explicit `INCI:` prefix is the most
  // predictable signal, and the file order (skincare → haircare → dental → supplements)
  // resolves shared tokens like NIACINAMIDE to the canonical skincare slug rather than
  // a domain-suffixed variant (niacinamide-hair, etc.).
  for (const { rel } of SLUG_FILES) {
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
      for (const tok of parsed.tokens) add(tok, parsed.slug)
    }
  }

  // Source 2: markdown `## INCI` blocks fill any token the slug-file pass missed.
  for (const ing of ingredientData) {
    for (const tok of parseInciFromContent(ing.content)) add(tok, ing.slug)
  }

  return index
}

/**
 * Slugs whose canonical INCI token sits on EXCIPIENT_BLOCKLIST. Lets a *resolved* slug be
 * dropped even when the raw token that produced it was a non-blocklisted synonym (e.g.
 * `Polydimethylsiloxane` → dimethicone, `Gomme Xanthane` → xanthan-gum). buildInciIndex drops
 * blocklisted tokens at construction, so we rebuild the index keeping them and collect their slugs.
 */
export function buildExcipientSlugs(): Set<string> {
  const full = buildInciIndex({ includeExcipients: true })
  const slugs = new Set<string>()
  for (const [token, entry] of full) {
    if (EXCIPIENT_BLOCKLIST.has(token)) slugs.add(entry.slug)
  }
  return slugs
}

/**
 * Every ingredient slug → its source-file domain. Unlike the inci index (which only carries
 * slugs that expose an INCI token), this covers the full slug set, so a slug reached by the
 * humanised-word bridge still gets domain-filtered. First file wins on cross-domain collision.
 */
export function buildSlugDomainMap(): Map<string, IngredientDomain> {
  const validSlugs = new Set<string>(Object.values(INGREDIENT_SLUGS))
  const map = new Map<string, IngredientDomain>()
  for (const { rel, domain } of SLUG_FILES) {
    // Fail loud: a swallowed read would silently drop this domain's slugs, letting them
    // bypass the category filter (cross-domain leak). A missing seed file is a bug, not a skip.
    const text = readFileSync(join(INGREDIENTS_ROOT, rel), 'utf-8')
    for (const m of text.matchAll(/^\s*[A-Z][A-Z0-9_]*\s*:\s*['"]([^'"]+)['"]/gm)) {
      const slug = m[1]
      if (validSlugs.has(slug) && !map.has(slug)) map.set(slug, domain)
    }
  }
  return map
}

export function getDomainAllowlist(category: string | undefined): Set<IngredientDomain> | null {
  if (!category) return null
  const list = CATEGORY_DOMAIN_ALLOWLIST[category]
  return list ? new Set(list) : null
}
