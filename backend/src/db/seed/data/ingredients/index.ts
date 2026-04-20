import type { IngredientInput } from './seed-ingredients'
import { dentalIngredients } from './dental'
import { haircareIngredients } from './haircare'
import { skincareIngredients } from './skincare'
import { supplementIngredients } from './supplements'

export type { IngredientInput }
export { INGREDIENT_SLUGS } from './ingredient-slugs'

// Some haircare stubs reuse slugs that are already defined (with full content)
// in skincare/supplements/dental — first occurrence wins so the curated entry
// is kept and stubs collapse silently instead of poisoning the seed tx.
function dedupeBySlug(entries: IngredientInput[]): IngredientInput[] {
  const seen = new Set<string>()
  const kept: IngredientInput[] = []
  const dropped: string[] = []
  for (const entry of entries) {
    if (seen.has(entry.slug)) {
      dropped.push(entry.slug)
      continue
    }
    seen.add(entry.slug)
    kept.push(entry)
  }
  if (dropped.length > 0) {
    console.warn(
      `⚠️  ${dropped.length} ingrédient(s) seed ignoré(s) (slug déjà défini plus tôt) : ${dropped.join(', ')}`
    )
  }
  return kept
}

export const ingredientData: IngredientInput[] = dedupeBySlug([
  ...skincareIngredients.map((i) => ({ type: 'skincare' as const, ...i })),
  ...supplementIngredients,
  ...dentalIngredients,
  ...haircareIngredients,
])
