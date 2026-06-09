// Detect products where kind doesn't match name signal (e.g., "Baume Yeux" kind=moisturizer).
// Upstream kind bugs propagate as FPs to texture, kind-tag, and formula detectors.
//
// Confidence tiers:
//   certain: --write applies the fix
//   likely: reported only, not auto-applied
//
// Usage:
//   bun run .../audit-product-kinds.ts            # dry-run
//   bun run .../audit-product-kinds.ts --write    # apply certain
//   bun run .../audit-product-kinds.ts --slug s   # single product

import { PRODUCT_KINDS, type ProductCategory, type ProductKind } from '@aurore/shared'

import { eq } from 'drizzle-orm'

import { db } from '../../../../db'
import type { Transaction } from '../../../../db/index'
import { withAdminRls } from '../../../../db/rls'
import { products } from '../../../../db/schema'

// fallow-ignore-next-line code-duplication
const WRITE = process.argv.includes('--write')
// fallow-ignore-next-line code-duplication
const SLUG_ARG = (() => {
  const i = process.argv.indexOf('--slug')
  return i !== -1 ? process.argv[i + 1] : null
})()

type Confidence = 'certain' | 'likely'

interface KindRule {
  name: string
  match: RegExp
  forbidden?: RegExp
  expected: ProductKind
  okIfKindIn?: ReadonlySet<ProductKind>
  confidence: Confidence
  why: string
}

// PRODUCT_KINDS is grouped by category; reverse to kind → category.
const KIND_TO_CATEGORY: Record<ProductKind, ProductCategory> = (() => {
  const map = {} as Record<ProductKind, ProductCategory>
  for (const [cat, kinds] of Object.entries(PRODUCT_KINDS)) {
    for (const k of Object.values(kinds)) {
      map[k as ProductKind] = cat as ProductCategory
    }
  }
  return map
})()

// First match wins: ordered by signal specificity so "Eau Micellaire Visage Yeux Lèvres"
// routes to cleanser (demaquillant rule), not eye-cream/lip-care.
// Forbidden patterns omit trailing \b to allow conjugated suffixes (e.g. "démaquillante").
const RULES: KindRule[] = [
  {
    name: 'demaquillant',
    match: /\bd[eé]maquillant|\bmicellair|\bmicellar/i,
    // "shampoing micellaire" is a hair shampoo — let it fall through to the shampoo rule.
    forbidden: /\bshampo+ing?\b|\bshampoo\b/i,
    expected: 'cleanser',
    okIfKindIn: new Set<ProductKind>(['cleanser']),
    confidence: 'certain',
    why: '"démaquillant/micellaire" → cleanser',
  },
  {
    name: 'shampoo',
    match: /\bshampo+ing?\b|\bshampoo\b/i,
    // Démêlant intentionally not forbidden: "shampoing démêlant" = shampoo (rule order ensures it wins).
    forbidden:
      /\bapr[eéèê]s[-\s]?shampo+ing?|\bavant[-\s]?shampo+ing?|\bconditioner|\bdouche|\bshower/i,
    expected: 'shampoo',
    confidence: 'certain',
    why: '"shampooing/shampoo" → shampoo',
  },
  {
    name: 'conditioner',
    match: /\bapr[eéèê]s[-\s]?shampo+ing?|\bconditioner|\bd[eéèê]m[eéèê]lant/i,
    expected: 'conditioner',
    confidence: 'certain',
    why: '"après-shampooing/conditioner/démêlant" → conditioner',
  },
  {
    name: 'toothpaste',
    match: /\bdentifrice|\btoothpaste/i,
    expected: 'toothpaste',
    confidence: 'certain',
    why: '"dentifrice/toothpaste" → toothpaste',
  },
  {
    name: 'deodorant',
    match: /\bd[eé]odorant|\bantiperspirant/i,
    // Products with both "déodorant" + "douche/shower" in the name are not deodorants —
    // they fall to the body-wash rule (which matches on "douche"). "Déo-douche" brand names
    // are excluded there too (body-wash forbidden) and keep their existing DB kind.
    forbidden: /\bdouche|\bshower/i,
    expected: 'deodorant',
    confidence: 'certain',
    why: '"déodorant/antiperspirant" → deodorant',
  },
  {
    name: 'eye-cream',
    match: /\b(yeux|eye)\b/i,
    forbidden:
      /\bd[eé]maquillant|\bmicellair|\bmicellar|\bcils\b|\bsourcils\b|\bmascara|\bliner|\bcrayon|\bpencil|\bfard|\bshadow|\bprimer/i,
    expected: 'eye-cream',
    // patch/mask are admin's call for eye patches/masks.
    okIfKindIn: new Set<ProductKind>(['eye-cream', 'patch', 'mask']),
    confidence: 'certain',
    why: '"yeux/eye" → eye-cream',
  },
  {
    name: 'lip-care',
    match: /\b(l[èe]vres?|levers?|lip)\b/i,
    // Exclude chemistry tokens (lipid/liposome) and makeup.
    forbidden:
      /\blipid|\bliposom|\blipo[-\s]?soluble|\bd[eé]maquillant|\bmicellair|\bmicellar|yeux\s+et\s+l[èe]vres|l[èe]vres\s+et\s+yeux/i,
    expected: 'lip-care',
    okIfKindIn: new Set<ProductKind>(['lip-care', 'balm']),
    confidence: 'certain',
    why: '"lèvres/lip" → lip-care',
  },

  // hair-mask/hair-oil before hair-misc: order = priority. Promoted to certain after
  // gold-set audit confirmed 14/14 unambiguous (forbidden excludes body/shampoo/SPF combos).
  {
    name: 'hair-mask',
    match: /(?=.*\b(cheveux|capi[ll]?aire|cuir\s+chevelu|scalp|dercos)\b)(?=.*\b(masque|mask)\b)/i,
    forbidden: /\bcorps\b|\bbody\b|\bdouche\b|\bshower\b/i,
    expected: 'hair-mask',
    confidence: 'certain',
    why: 'hair word + masque → hair-mask',
  },
  {
    name: 'hair-oil',
    match: /(?=.*\b(cheveux|capi[ll]?aire|cuir\s+chevelu|scalp|dercos)\b)(?=.*\b(huile|oil)\b)/i,
    forbidden: /\bcorps\b|\bbody\b|\bessentielle\b/i,
    expected: 'hair-oil',
    confidence: 'certain',
    why: 'hair word + huile → hair-oil',
  },
  {
    name: 'hair-misc',
    match: /\b(cheveux|capi[ll]?aire|cuir\s+chevelu|scalp|dercos)\b/i,
    forbidden:
      /\bshampo+ing?\b|\bshampoo\b|\bcorps\b|\bbody\b|\bspf\d|\bsolaire\b|\bsunscreen\b|\bdouche\b|\bshower\b|\bd[eé]maquillant/i,
    expected: 'hair-serum',
    okIfKindIn: new Set<ProductKind>([
      'hair-serum',
      'hair-mask',
      'hair-oil',
      'shampoo',
      'conditioner',
      'styling',
      'sunscreen',
      'body-wash',
    ]),
    confidence: 'certain',
    why: '"cheveux/capillaire/scalp" → hair-serum',
  },
  {
    name: 'aftershave',
    match: /\brasage|\bafter[-\s]?shave|\baftershave/i,
    // Shaving foam/cream/gel = cleanser, not balm.
    forbidden: /\bgel\s+moussant|\bmousse\b|\bcr[èe]me\s+[àa]\s+raser/i,
    expected: 'balm',
    confidence: 'certain',
    why: '"rasage/after-shave" → balm',
  },
  {
    name: 'body-wash',
    // body wash allows 2 intervening words ("Body Moisturizing Wash").
    // lavante?s? routes Avène/Ducray/A-Derma rinse-off products mistagged moisturizer/body-oil.
    match:
      /\bdouche|\bshower|\bbody[-\s]+(?:\w+\s+){0,2}wash\b|\b(?:baby|kids?)\s+wash\b|\b(?:huile|gel|cr[èe]me|cream)\s+lavante?s?\b/i,
    forbidden: /\bcorps\s*(?:&|et)\s*cheveux|\bbody\s*(?:&|and)\s*hair|\bd[eé]o[-\s]?douche/i,
    expected: 'body-wash',
    okIfKindIn: new Set<ProductKind>(['body-wash', 'cleanser']),
    confidence: 'certain',
    why: '"douche/shower/body wash/huile-gel-crème lavante" → body-wash',
  },
  {
    name: 'wash-off-mask',
    match: /\bwash[-\s]off\s+(?:pack|mask)\b/i,
    expected: 'mask',
    okIfKindIn: new Set<ProductKind>(['mask', 'patch', 'exfoliant']),
    confidence: 'certain',
    why: '"wash off pack/mask" → mask',
  },
  {
    name: 'hand-cream',
    match: /\bmains\b|\bhand\b/i,
    forbidden:
      /\bhydroalcoolique|\bsanitizer|\bhand[-\s]?wash|\blavant\b|\bvisage\b|\bface\b|\bspf\d|\bsolaire\b/i,
    expected: 'hand-cream',
    confidence: 'certain',
    why: '"mains/hand" → hand-cream',
  },
  {
    name: 'foot-cream',
    match: /\bpieds\b|\bfoot\b|\bfeet\b/i,
    forbidden: /\bbain\b|\blavant\b/i,
    expected: 'foot-cream',
    confidence: 'certain',
    why: '"pieds/foot" → foot-cream',
  },
  {
    name: 'body-lotion',
    match: /\bcorps\b|\bbody\b/i,
    // " + " catches multi-product gift sets.
    forbidden:
      /\bdouche|\bshower|\bgommage|\bscrub|\bhuile|\boil\b|\bcheveux|\bhair\b|\bwash\b|\blavant|\bnettoyant|\bcleanser|\bcleansing|\bsavon\b|\bsoap\b|\bpain\b|\blingettes?\b|\bwipes?\b|\bmist\b|\bbrume\b|\bspf\d|\bsolaire\b|\bsunscreen\b|\bautobronzant|\bself[-\s]?tan|\bapr[eéè]s[-\s]?soleil|\bafter[-\s]?sun|\bmasque\b|\bmask\b|\bs[eé]rum\b|\sserum\b|\s\+\s|\bm[eé]nopause\b/i,
    expected: 'body-lotion',
    okIfKindIn: new Set<ProductKind>([
      'body-lotion',
      'body-oil',
      'body-scrub',
      'body-wash',
      'sunscreen',
      'after-sun',
      'self-tanner',
      'mist',
      'cleanser',
      'mask',
      'patch',
      'exfoliant',
      'hair-serum',
      'serum',
    ]),
    confidence: 'certain',
    why: '"corps/body" + cream/lotion context → body-lotion',
  },
  {
    name: 'cleanser-face',
    // Last-resort: rinse-off face products mistagged moisturizer. Body/hair routed earlier.
    match: /\b(nettoyante?s?|cleansing|cleanser|whip\s+cleanser|(?:powder|enzyme|face)\s+wash)\b/i,
    forbidden:
      /\bcorps\b|\bbody\b|\bcheveux\b|\bcapi[ll]?aire\b|\bcuir\s+chevelu\b|\bscalp\b|\bshampo+ing?\b|\bshampoo\b|\bdouche\b|\bshower\b|\bl[èe]vres?\b|\blip\b|\byeux\b|\beye\b|\bmains?\b|\bhand\b|\bpieds?\b|\bfoot\b|\bp[eé]eling\b|\bmousse\s+cr[eé]pitante|\bautobronzant|\bapr[eèé]s[-\s]?soleil|\bafter[-\s]?sun|\bspf\d|\bsolaire\b|\bsunscreen\b/i,
    expected: 'cleanser',
    // Cleansing balms/oils keep their kind (admin's call); exfoliants/masks/patches too.
    okIfKindIn: new Set<ProductKind>([
      'cleanser',
      'body-wash',
      'balm',
      'oil',
      'exfoliant',
      'mask',
      'patch',
      'shampoo',
    ]),
    confidence: 'certain',
    why: '"nettoyant/cleansing/cleanser/powder-enzyme-face wash" → cleanser',
  },
]

// Brand names containing rule-trigger words (e.g. "Eye Care") would falsely match.
// Names commonly repeat the brand prefix as a marketing convention.
function stripBrandPrefix(name: string, brand: string): string {
  if (!brand) return name
  const escaped = brand.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
  return name.replace(new RegExp(`^${escaped}\\s+`, 'i'), '')
}

interface Mismatch {
  productId: string
  slug: string
  brand: string
  name: string
  currentKind: ProductKind
  currentCategory: ProductCategory
  expectedKind: ProductKind
  expectedCategory: ProductCategory
  confidence: Confidence
  why: string
  ruleName: string
}

type ProductRow = {
  id: string
  slug: string
  brand: string
  name: string
  kind: ProductKind
  category: ProductCategory
}

async function loadProducts(): Promise<ProductRow[]> {
  const rows = await db
    .select({
      id: products.id,
      slug: products.slug,
      brand: products.brand,
      name: products.name,
      kind: products.kind,
      category: products.category,
    })
    .from(products)
  return rows as ProductRow[]
}

function ruleTriggers(rule: KindRule, name: string): boolean {
  return rule.match.test(name) && !rule.forbidden?.test(name)
}

function ruleAcceptsCurrentKind(rule: KindRule, kind: ProductKind): boolean {
  return kind === rule.expected || rule.okIfKindIn?.has(kind) === true
}

function buildMismatch(rule: KindRule, p: ProductRow): Mismatch {
  return {
    productId: p.id,
    slug: p.slug,
    brand: p.brand,
    name: p.name,
    currentKind: p.kind,
    currentCategory: p.category,
    expectedKind: rule.expected,
    expectedCategory: KIND_TO_CATEGORY[rule.expected],
    confidence: rule.confidence,
    why: rule.why,
    ruleName: rule.name,
  }
}

function findFiringRule(name: string): KindRule | undefined {
  return RULES.find((r) => ruleTriggers(r, name))
}

function auditOne(p: ProductRow): Mismatch | null {
  const fired = findFiringRule(stripBrandPrefix(p.name, p.brand))
  if (!fired) return null
  if (ruleAcceptsCurrentKind(fired, p.kind)) return null
  return buildMismatch(fired, p)
}

function auditProducts(subset: ProductRow[]): Mismatch[] {
  return subset.flatMap((p) => {
    const m = auditOne(p)
    return m ? [m] : []
  })
}

function groupByRule(items: Mismatch[]): Map<string, Mismatch[]> {
  const byRule = new Map<string, Mismatch[]>()
  for (const item of items) {
    const arr = byRule.get(item.ruleName) ?? []
    arr.push(item)
    byRule.set(item.ruleName, arr)
  }
  return byRule
}

function printTier(tier: string, items: Mismatch[]) {
  console.log(`── ${tier.toUpperCase()} (${items.length}) ──`)
  for (const [rule, ruleItems] of groupByRule(items)) {
    console.log(`\n  [${rule}] ${ruleItems.length} produit(s) — ${ruleItems[0].why}`)
    for (const m of ruleItems) {
      console.log(
        `    ${m.currentKind.padEnd(16)} → ${m.expectedKind.padEnd(14)} ${m.brand} | ${m.name}`
      )
    }
  }
  console.log()
}

async function applyCertainFixes(certain: Mismatch[]): Promise<void> {
  if (certain.length === 0) {
    console.log('ℹ️  No certain fixes to apply.')
    return
  }
  console.log(`✏️  Applying ${certain.length} certain fixes...`)
  await withAdminRls(async (tx: Transaction) => {
    for (const m of certain) {
      await tx
        .update(products)
        .set({ kind: m.expectedKind, category: m.expectedCategory })
        .where(eq(products.id, m.productId))
    }
  })
  console.log(
    `✅ ${certain.length} products updated. Re-run \`make backfill-auto-tags WRITE=1\` to refresh tags.`
  )
}

function pickSubset(all: ProductRow[], slug: string | null): ProductRow[] {
  if (!slug) return all
  const subset = all.filter((p) => p.slug === slug)
  if (subset.length === 0) throw new Error(`Product slug "${slug}" not found`)
  return subset
}

function printSummary(certain: Mismatch[], likely: Mismatch[], scanned: number) {
  console.log('🔎 Audit product kinds')
  console.log(
    `   mode=${WRITE ? 'WRITE (certain only)' : 'DRY-RUN'} · ${scanned} produits scannés\n`
  )
  console.log(`   certain : ${certain.length}`)
  console.log(`   likely  : ${likely.length}\n`)
  if (certain.length > 0) printTier('certain', certain)
  if (likely.length > 0) printTier('likely', likely)
}

async function main() {
  const subset = pickSubset(await loadProducts(), SLUG_ARG)
  const mismatches = auditProducts(subset)
  const certain = mismatches.filter((m) => m.confidence === 'certain')
  const likely = mismatches.filter((m) => m.confidence === 'likely')
  printSummary(certain, likely, subset.length)
  if (WRITE) await applyCertainFixes(certain)
}

main()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error(err)
    process.exit(1)
  })
