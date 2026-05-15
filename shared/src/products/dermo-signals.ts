// Slugs flagged as a "signal" in the comparator. Active slugs map to the seed
// taxonomy; alert slugs are partly prospective (see note below).

export const ACTIVE_INGREDIENT_SLUGS: ReadonlySet<string> = new Set([
  'niacinamide',
  'hyaluronic-acid',
  'sodium-hyaluronate',
  'retinol',
  'retinal',
  'granactive-retinoid',
  'hydroxypinacolone-retinoate',
  'bakuchiol',
  'azelaic-acid',
  'glycolic-acid',
  'lactic-acid',
  'salicylic-acid',
  'vitamin-c',
  'tocopherol',
  'panthenol',
  'centella-asiatica',
  'allantoin',
  'copper-peptides',
  'matrixyl-3000',
  'palmitoyl-tripeptide-1',
  'argireline',
])

// Alert slugs are prospective: most are not yet present in the seed taxonomy,
// so the alert path is currently inert. They will activate as the seed grows.
export const ALERT_INGREDIENT_SLUGS: ReadonlySet<string> = new Set([
  'parfum',
  'fragrance',
  'alcool-denat',
  'denatured-alcohol',
  'methylisothiazolinone',
  'methylchloroisothiazolinone',
  'limonene',
  'linalool',
  'huile-essentielle-citron',
  'huile-essentielle-menthe',
])

export type DermoSignal = 'active' | 'alert'

export function classifyIngredientSignals(slug: string): DermoSignal[] {
  const out: DermoSignal[] = []
  if (ACTIVE_INGREDIENT_SLUGS.has(slug)) out.push('active')
  if (ALERT_INGREDIENT_SLUGS.has(slug)) out.push('alert')
  return out
}

// EU 1223/2009 fragrance allergens + raw fragrance markers. Names checked
// lowercased — INCI seed normalises casing, but UI may pass either slug or name.
export const FRAGRANCE_COMPONENT_SLUGS: ReadonlySet<string> = new Set([
  'parfum',
  'fragrance',
  'limonene',
  'linalool',
  'citronellol',
  'geraniol',
  'citral',
  'eugenol',
  'coumarin',
  'isoeugenol',
  'hexyl-cinnamal',
  'amyl-cinnamal',
  'hydroxycitronellal',
  'alpha-isomethyl-ionone',
  'benzyl-salicylate',
  'benzyl-cinnamate',
  'huile-essentielle-citron',
  'huile-essentielle-menthe',
])

export function hasFragranceComponent(
  ingredients: ReadonlyArray<{ ingredientSlug?: string | null; ingredientName?: string | null }>
): boolean {
  for (const ing of ingredients) {
    if (ing.ingredientSlug && FRAGRANCE_COMPONENT_SLUGS.has(ing.ingredientSlug)) return true
    if (ing.ingredientName) {
      const normalised = ing.ingredientName.trim().toLowerCase().replace(/\s+/g, '-')
      if (FRAGRANCE_COMPONENT_SLUGS.has(normalised)) return true
      // Match raw `parfum (fragrance)` / `fragrance (parfum)` INCI lines that
      // never resolve to a clean slug.
      if (/^(parfum|fragrance)\b/.test(ing.ingredientName.trim().toLowerCase())) return true
    }
  }
  return false
}
