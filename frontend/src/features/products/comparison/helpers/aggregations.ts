import type { EnrichedComparisonProduct } from '@habit-tracker/shared'
import { DERMO_CONFLICTS, type DermoConflict } from '@habit-tracker/shared'

type Ingredient = EnrichedComparisonProduct['ingredients'][number]

function ingredientsBySlug(products: EnrichedComparisonProduct[]) {
  const map = new Map<string, { ingredient: Ingredient; productIds: Set<string> }>()
  for (const p of products) {
    for (const i of p.ingredients) {
      const entry = map.get(i.slug) ?? { ingredient: i, productIds: new Set<string>() }
      entry.productIds.add(p.id)
      map.set(i.slug, entry)
    }
  }
  return map
}

export function computeCommon(products: EnrichedComparisonProduct[]): Ingredient[] {
  if (products.length === 0) return []
  const total = products.length
  const map = ingredientsBySlug(products)
  return [...map.values()].filter((e) => e.productIds.size === total).map((e) => e.ingredient)
}

export function computeSpecifics(products: EnrichedComparisonProduct[]): Map<string, Ingredient[]> {
  const common = new Set(computeCommon(products).map((i) => i.slug))
  const result = new Map<string, Ingredient[]>()
  for (const p of products) {
    result.set(
      p.id,
      p.ingredients.filter((i) => !common.has(i.slug))
    )
  }
  return result
}

export function computeSharedActives(products: EnrichedComparisonProduct[]): Ingredient[] {
  return computeCommon(products).filter((i) => i.signals.includes('active'))
}

export type AlertSummary = {
  slug: string
  inciName: string
  presentIn: string[]
}

export function computeAlerts(products: EnrichedComparisonProduct[]): AlertSummary[] {
  const map = ingredientsBySlug(products)
  const alerts: AlertSummary[] = []
  const productOrder = products.map((p) => p.id)
  for (const entry of map.values()) {
    if (!entry.ingredient.signals.includes('alert')) continue
    alerts.push({
      slug: entry.ingredient.slug,
      inciName: entry.ingredient.inciName,
      presentIn: productOrder.filter((id) => entry.productIds.has(id)),
    })
  }
  return alerts
}

export function computeConflicts(products: EnrichedComparisonProduct[]): DermoConflict[] {
  const slugs = new Set<string>()
  for (const p of products) for (const i of p.ingredients) slugs.add(i.slug)
  return DERMO_CONFLICTS.filter((c) => slugs.has(c.a) && slugs.has(c.b))
}
