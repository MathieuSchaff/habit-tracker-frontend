import {
  DOMAIN_NEUTRAL_PRODUCT_TAG_TYPES,
  DOMAIN_PRODUCT_FILTER_CATEGORIES,
  PRODUCT_CATEGORY_TO_DOMAIN_TAB,
} from '@aurore/shared'

import { and, count, eq, isNull, or, sql } from 'drizzle-orm'

import type { DB } from '..'
import { db } from '..'
import {
  ingredientDermoProfiles,
  ingredients,
  productIngredients,
  products,
  productTagLinks,
  productTagTypes,
} from '../schema'

// 'error' fails the run (exit 1): genuine corruption the DB does not enforce.
// 'info' is reported but never fails: accepted coverage gaps (missing data ≠ broken data).
type Severity = 'error' | 'info'
type Finding = { description: string }
type CheckResult = { name: string; severity: Severity; findings: Finding[] }
type Checker = (db: DB) => Promise<CheckResult>

async function checkTagProductDomainConsistency(db: DB): Promise<CheckResult> {
  const rows = await db
    .select({
      productSlug: products.slug,
      productCategory: products.category,
      tagSlug: productTagTypes.slug,
      tagType: productTagTypes.tagType,
    })
    .from(productTagLinks)
    .innerJoin(products, eq(productTagLinks.productId, products.id))
    .innerJoin(productTagTypes, eq(productTagLinks.productTagId, productTagTypes.id))

  const findings: Finding[] = []
  for (const row of rows) {
    const domain = PRODUCT_CATEGORY_TO_DOMAIN_TAB[row.productCategory]
    if (!domain) {
      findings.push({
        description: `unknown product.category="${row.productCategory}" on product ${row.productSlug}`,
      })
      continue
    }
    const validTagTypes = DOMAIN_PRODUCT_FILTER_CATEGORIES[domain] as readonly string[]
    if (
      !validTagTypes.includes(row.tagType) &&
      !DOMAIN_NEUTRAL_PRODUCT_TAG_TYPES.includes(row.tagType)
    ) {
      findings.push({
        description: `${row.productSlug} (${row.productCategory}/${domain}) → tag "${row.tagSlug}" type="${row.tagType}" not in [${validTagTypes.join(', ')}]`,
      })
    }
  }
  return { name: 'tag-product-domain-consistency', severity: 'error', findings }
}

// Visible products with no image. Accepted gap (image acquisition is a separate
// domain), so info-only. Surfaced by brand to spot which brands need a fetch pass.
async function checkImageCoverage(db: DB): Promise<CheckResult> {
  const rows = await db
    .select({ brand: products.brand, n: count() })
    .from(products)
    .where(
      and(
        eq(products.moderationStatus, 'visible'),
        or(isNull(products.imageUrl), eq(products.imageUrl, ''))
      )
    )
    .groupBy(products.brand)
    .orderBy(sql`count(*) desc`)

  const findings: Finding[] = rows.map((r) => ({ description: `${r.brand}: ${r.n}` }))
  if (rows.length > 0) {
    const total = rows.reduce((s, r) => s + Number(r.n), 0)
    findings.unshift({
      description: `${total} visible products without image across ${rows.length} brands`,
    })
  }
  return { name: 'image-coverage', severity: 'info', findings }
}

// Visible products with zero linked ingredients, bucketed so the actionable signal
// (a real INCI list that still resolved to nothing) is not drowned by the legitimate
// long tail: supplements/accessories carry no INCI, and a comma-less blob is a
// nutrition table, a material blurb, or scraper-lost separators (P3), never a linking gap.
async function checkProductsWithoutIngredients(db: DB): Promise<CheckResult> {
  const rows = await db
    .select({ slug: products.slug, brand: products.brand, inci: products.inci })
    .from(products)
    .leftJoin(productIngredients, eq(productIngredients.productId, products.id))
    .where(and(eq(products.moderationStatus, 'visible'), isNull(productIngredients.productId)))

  let noInci = 0
  let commaless = 0
  const parseableUnlinked: Finding[] = []
  for (const r of rows) {
    const inci = r.inci?.trim() ?? ''
    if (!inci) noInci++
    else if (!inci.includes(',')) commaless++
    else parseableUnlinked.push({ description: `${r.slug} (${r.brand})` })
  }

  const findings: Finding[] = parseableUnlinked
  findings.unshift(
    { description: `${noInci} without INCI (supplements/accessories — expected)` },
    {
      description: `${commaless} INCI without comma delimiter (nutrition/material/mangled — see P3)`,
    },
    {
      description: `${parseableUnlinked.length} with a real INCI list but 0 links (review: obscure botanicals or excipient-only formulas)`,
    }
  )
  return { name: 'products-without-ingredients', severity: 'info', findings }
}

// Visible products with zero tag links (invisible to the catalogue filters).
async function checkProductsWithoutTags(db: DB): Promise<CheckResult> {
  const rows = await db
    .select({ slug: products.slug, brand: products.brand })
    .from(products)
    .leftJoin(productTagLinks, eq(productTagLinks.productId, products.id))
    .where(and(eq(products.moderationStatus, 'visible'), isNull(productTagLinks.productId)))

  const findings: Finding[] = rows.map((r) => ({ description: `${r.slug} (${r.brand})` }))
  return { name: 'products-without-tags', severity: 'info', findings }
}

// Ingredients used by ≥1 product but lacking a dermo profile row. The dermo SCORE
// comes from algo-derm at runtime, not this table. The only consumer reads `is_filler`
// (user-products/dermo-signal), and a missing row defaults to non-filler. So this is a
// filler-classification coverage gap, not a scoring blind spot.
async function checkIngredientsWithoutDermoProfile(db: DB): Promise<CheckResult> {
  const rows = await db
    .select({ slug: ingredients.slug })
    .from(ingredients)
    .innerJoin(productIngredients, eq(productIngredients.ingredientId, ingredients.id))
    .leftJoin(ingredientDermoProfiles, eq(ingredientDermoProfiles.ingredientId, ingredients.id))
    .where(isNull(ingredientDermoProfiles.ingredientId))
    .groupBy(ingredients.slug)

  const findings: Finding[] = rows.map((r) => ({ description: r.slug }))
  return { name: 'ingredients-without-dermo-profile', severity: 'info', findings }
}

const checkers: Checker[] = [
  checkTagProductDomainConsistency,
  checkImageCoverage,
  checkProductsWithoutIngredients,
  checkProductsWithoutTags,
  checkIngredientsWithoutDermoProfile,
]

// File output wants every finding; interactive console stays capped.
const MAX_LINES_PER_CHECKER = process.env.AUDIT_DB_FULL ? Number.POSITIVE_INFINITY : 30

async function main() {
  const results = await Promise.all(checkers.map((c) => c(db)))
  let errorViolations = 0
  let failedCheckers = 0

  for (const r of results) {
    if (r.findings.length === 0) {
      console.log(`✓ ${r.name}`)
      continue
    }
    if (r.severity === 'info') {
      console.log(`ℹ ${r.name} (${r.findings.length})`)
    } else {
      failedCheckers += 1
      errorViolations += r.findings.length
      console.log(`✗ ${r.name} (${r.findings.length} violations)`)
    }
    for (const f of r.findings.slice(0, MAX_LINES_PER_CHECKER)) {
      console.log(`  - ${f.description}`)
    }
    if (r.findings.length > MAX_LINES_PER_CHECKER) {
      console.log(`  … and ${r.findings.length - MAX_LINES_PER_CHECKER} more`)
    }
  }

  if (errorViolations > 0) {
    console.error(
      `\nFAILED: ${errorViolations} violation(s) across ${failedCheckers} error checker(s)`
    )
    process.exit(1)
  }
  console.log(`\n✓ All ${checkers.length} checker(s) ran; no error-level violations`)
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
