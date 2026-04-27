import {
  DOMAIN_PRODUCT_FILTER_CATEGORIES,
  PRODUCT_CATEGORY_TO_DOMAIN_TAB,
} from '@habit-tracker/shared'

import { eq } from 'drizzle-orm'

import type { DB } from '..'
import { db } from '..'
import { products, productTagsDefs, tagProducts } from '../schema'

type Violation = { description: string }
type CheckResult = { name: string; violations: Violation[] }
type Checker = (db: DB) => Promise<CheckResult>

async function checkTagProductDomainConsistency(db: DB): Promise<CheckResult> {
  const rows = await db
    .select({
      productSlug: products.slug,
      productCategory: products.category,
      tagSlug: productTagsDefs.slug,
      tagType: productTagsDefs.tagType,
    })
    .from(tagProducts)
    .innerJoin(products, eq(tagProducts.productId, products.id))
    .innerJoin(productTagsDefs, eq(tagProducts.productTagId, productTagsDefs.id))

  const violations: Violation[] = []
  for (const row of rows) {
    const domain = PRODUCT_CATEGORY_TO_DOMAIN_TAB[row.productCategory]
    if (!domain) {
      violations.push({
        description: `unknown product.category="${row.productCategory}" on product ${row.productSlug}`,
      })
      continue
    }
    const validTagTypes = DOMAIN_PRODUCT_FILTER_CATEGORIES[domain] as readonly string[]
    if (!validTagTypes.includes(row.tagType)) {
      violations.push({
        description: `${row.productSlug} (${row.productCategory}/${domain}) → tag "${row.tagSlug}" type="${row.tagType}" not in [${validTagTypes.join(', ')}]`,
      })
    }
  }
  return { name: 'tag-product-domain-consistency', violations }
}

const checkers: Checker[] = [checkTagProductDomainConsistency]

const MAX_LINES_PER_CHECKER = 30

async function main() {
  const results = await Promise.all(checkers.map((c) => c(db)))
  let totalViolations = 0
  let failedCheckers = 0

  for (const r of results) {
    if (r.violations.length === 0) {
      console.log(`✓ ${r.name}`)
      continue
    }
    failedCheckers += 1
    totalViolations += r.violations.length
    console.log(`✗ ${r.name} (${r.violations.length} violations)`)
    for (const v of r.violations.slice(0, MAX_LINES_PER_CHECKER)) {
      console.log(`  - ${v.description}`)
    }
    if (r.violations.length > MAX_LINES_PER_CHECKER) {
      console.log(`  … and ${r.violations.length - MAX_LINES_PER_CHECKER} more`)
    }
  }

  if (totalViolations > 0) {
    console.error(`\nFAILED: ${totalViolations} violation(s) across ${failedCheckers} checker(s)`)
    process.exit(1)
  }
  console.log(`\n✓ All ${checkers.length} checker(s) passed`)
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
