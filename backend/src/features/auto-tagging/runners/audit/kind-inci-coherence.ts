// Detect kind mistags the name-regex audit (product-kinds.ts) cannot see: products
// whose NAME carries no kind keyword but whose INCI contradicts the kind. The klorane
// "cold cream tagged shampoo" class. Signal is INCI composition, independent of the name.
//
// Only one rule today, high-precision and report-only (no --write): a rinse-off wash kind
// (shampoo/body-wash) whose substantial INCI contains no surfactant at all is almost never
// a real wash product (it's an oil, mask, treatment, colour or styling product mistagged).
// Dry shampoos are excluded — their propellant/starch INCI legitimately has no surfactant.
//
// It flags the contradiction, not the correct kind (could be hair-oil/mask/styling/…), so an
// admin triages each. Usage: bun run .../kind-inci-coherence.ts

import { db } from '../../../../db'
import { products } from '../../../../db/schema'

// Broad "is any surfactant present?" net (detergents, amphoterics, soaps, FR spellings),
// kept wide for low false positives; intentionally not shared with the anionic-only
// IONIC_SURFACTANT_PATTERNS (coupling audit explains why).
const SURFACTANT =
  /sulfate|sulfosuccinate|sarcosinate|glucoside|betaine|isethionate|taurate|sulfonate|cocoyl|cocamidopropyl|lauroyl|laureth|sultaine|sultaïne|amphodiac|amphoac|cocoate|palmate|olivate|sodium stearate|stearate de sodium|oleate|sulfoacetate|glutamate|carboxylate/i

// Aerosol/powder dry shampoos: no surfactant by design, legitimately kind=shampoo.
const DRY_SHAMPOO_INCI = /butane|propane|isobutane/i
const DRY_SHAMPOO_NAME = /\bshampo+ing?\s+sec\b|\bdry\s+shampoo\b/i

const WASH_KINDS = new Set(['shampoo', 'body-wash'])
const MIN_INCI_LEN = 60 // skip marketing one-liners / empty INCI — not enough signal

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
  return true
}

async function main() {
  const rows = (await db
    .select({
      slug: products.slug,
      brand: products.brand,
      name: products.name,
      kind: products.kind,
      inci: products.inci,
    })
    .from(products)) as ProductRow[]

  const flagged = rows.filter(isWashWithoutSurfactant)

  console.log('🔎 Kind ⇄ INCI coherence (report-only)\n')
  console.log(`   ${rows.length} produits scannés · ${flagged.length} contradictions\n`)

  if (flagged.length === 0) {
    console.log('✓ no wash-kind product without a surfactant')
    return
  }

  console.log('── WASH KIND, NO SURFACTANT IN INCI (likely mistag) ──')
  for (const p of flagged.sort((a, b) => a.brand.localeCompare(b.brand))) {
    console.log(`  ${p.kind.padEnd(10)} ${p.brand} | ${p.name}`)
  }
  console.log('\n  These are not auto-fixed: the correct kind (oil/mask/styling/treatment/…)')
  console.log(
    '  needs a human call. Fix with `SLUG=… WRITE=1 just audit-product-kinds` or by hand.'
  )
}

main()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error(err)
    process.exit(1)
  })
