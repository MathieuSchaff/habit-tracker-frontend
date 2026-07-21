// Detect kind mistags the name-regex audit (product-kinds.ts) cannot see: products
// whose NAME carries no kind keyword but whose INCI contradicts the kind. The klorane
// "cold cream tagged shampoo" class. Signal is INCI composition, independent of the name.
//
// Two high-precision, report-only rules (no --write):
//   1. a rinse-off wash kind (shampoo/body-wash) whose substantial INCI contains no
//      surfactant at all is almost never a real wash (oil/mask/treatment/colour/styling
//      mistagged). Dry shampoos are excluded — propellant/starch INCI has no surfactant.
//   2. the reverse — a leave-on kind (moisturizer/serum/…) whose INCI HEAD leads with a
//      primary wash detergent is a rinse-off (syndet bar / surgras gel) mistagged. Cetearyl
//      emulsifier and "SANS:" free-from lists are excluded so neither trips it.
//
// Each flags the contradiction, not the correct kind, so an admin triages.
// Usage: bun run .../kind-inci-coherence.ts

import { withAdminRls } from '../../../../db/rls'
import { products } from '../../../../db/schema'
import { exitOnError } from '../cli-args'

// Broad "is any surfactant present?" net (detergents, amphoterics, soaps, FR spellings),
// kept wide for low false positives; intentionally not shared with the anionic-only
// IONIC_SURFACTANT_PATTERNS (coupling audit explains why).
const SURFACTANT =
  /sulfate|sulfosuccinate|sarcosinate|glucoside|betaine|isethionate|taurate|sulfonate|cocoyl|cocamidopropyl|lauroyl|laureth|sultaine|sultaïne|amphodiac|amphoac|cocoate|palmate|olivate|sodium stearate|stearate de sodium|oleate|sulfoacetate|glutamate|carboxylate/i

// Aerosol/powder dry shampoos: no surfactant by design, legitimately kind=shampoo.
const DRY_SHAMPOO_INCI = /butane|propane|isobutane/i
const DRY_SHAMPOO_NAME = /\bshampo+ing?\s+sec\b|\bdry\s+shampoo\b/i

// Cold-process soap saponifies raw fats with lye in-situ, so the INCI lists the oils +
// "Sodium/Potassium Hydroxide" instead of the finished *-ate salt SURFACTANT catches.
// In a wash kind, lye alongside fatty oils/butters is saponification — a real soap,
// legitimately body-wash/shampoo — not a missing surfactant.
const SAPONIFIED_LYE = /\b(?:sodium|potassium)\s+hydroxide\b/i
const FATTY_MATTER = /\b(?:oil|butter|huile|beurre)\b/i

const WASH_KINDS = new Set(['shampoo', 'body-wash'])
const MIN_INCI_LEN = 60 // skip marketing one-liners / empty INCI — not enough signal

// Reverse signal: a leave-on kind whose INCI leads with a PRIMARY wash detergent
// is a rinse-off (syndet bar / surgras gel) mistagged. Cetearyl/coceth sulfate are
// excluded (emulsifiers, sit deep in creams) and the match is gated to the top
// ingredients so a trace emulsifier never trips it.
const LEAVE_ON_KINDS = new Set([
  'moisturizer',
  'serum',
  'toner',
  'essence',
  'eye-cream',
  'lip-care',
  'primer',
])
const WASH_PRIMARY =
  /(?:lauryl|laureth|myreth|coco-?)\s*sulfate|sulfosuccinate|cocoyl\s+isethionate|\bisethionate\b|cocoyl\s+sarcosinate|\bsarcosinate\b|sulfoacetate|cocoyl\s+taurate/i
const WASH_TOP_N = 4 // primary detergent sits in the first ingredients; deeper = adjuvant/emulsifier

// "SANS : … laurylsulfate" is a free-from claim, not an ingredient list — the surfactant
// token names an ABSENCE. Skip when the head carries such a marker (polluted INCI field).
const FREE_FROM = /\bsans\b\s*:|\bwithout\b\s*:|\bfree[-\s]?from\b|\b0\s*%/i

function leadsWithWashSurfactant(p: ProductRow): boolean {
  if (!LEAVE_ON_KINDS.has(p.kind)) return false
  if (!p.inci) return false
  const top = p.inci.split(',').slice(0, WASH_TOP_N).join(',')
  if (FREE_FROM.test(top)) return false
  return WASH_PRIMARY.test(top)
}

type ProductRow = {
  slug: string
  brand: string
  name: string
  kind: string
  inci: string | null
}

function isWashWithoutSurfactant(p: ProductRow): boolean {
  if (!WASH_KINDS.has(p.kind)) return false
  if (!p.inci || p.inci.length < MIN_INCI_LEN) return false
  if (SURFACTANT.test(p.inci)) return false
  if (DRY_SHAMPOO_INCI.test(p.inci) || DRY_SHAMPOO_NAME.test(p.name)) return false
  if (SAPONIFIED_LYE.test(p.inci) && FATTY_MATTER.test(p.inci)) return false
  return true
}

async function main() {
  // Elevated read: products_select_visible would silently drop non-`visible`
  // rows from a coherence audit meant to cover the whole catalogue.
  const rows = (await withAdminRls((tx) =>
    tx
      .select({
        slug: products.slug,
        brand: products.brand,
        name: products.name,
        kind: products.kind,
        inci: products.inci,
      })
      .from(products)
  )) as ProductRow[]

  const flagged = rows.filter(isWashWithoutSurfactant)
  const washMistagged = rows.filter(leadsWithWashSurfactant)

  console.log('🔎 Kind ⇄ INCI coherence (report-only)\n')
  console.log(
    `   ${rows.length} produits scannés · ${flagged.length} wash-sans-surfactant · ${washMistagged.length} leave-on-avec-lavant\n`
  )

  if (flagged.length === 0 && washMistagged.length === 0) {
    console.log('✓ no kind ⇄ INCI contradiction')
    return
  }

  if (flagged.length > 0) {
    console.log('── WASH KIND, NO SURFACTANT IN INCI (likely mistag) ──')
    for (const p of flagged.sort((a, b) => a.brand.localeCompare(b.brand))) {
      console.log(`  ${p.kind.padEnd(10)} ${p.brand} | ${p.name}`)
    }
  }

  if (washMistagged.length > 0) {
    console.log('\n── LEAVE-ON KIND, PRIMARY WASH SURFACTANT IN INCI HEAD (likely a wash) ──')
    for (const p of washMistagged.sort((a, b) => a.brand.localeCompare(b.brand))) {
      const head = (p.inci ?? '').split(',').slice(0, WASH_TOP_N).join(',').trim()
      console.log(`  ${p.kind.padEnd(11)} ${p.brand} | ${p.name}`)
      console.log(`     ↳ ${head}…`)
    }
  }

  console.log(
    '\n  These are not auto-fixed: the correct kind (oil/mask/styling/treatment/cleanser/…)'
  )
  console.log(
    '  needs a human call. Fix with `SLUG=… WRITE=1 just audit-product-kinds` or by hand.'
  )
}

main()
  .then(() => process.exit(0))
  .catch(exitOnError)
