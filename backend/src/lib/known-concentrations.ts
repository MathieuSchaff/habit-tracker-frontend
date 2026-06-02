// Builds the algo-derm `knownConcentrations` map from product_ingredients rows.
//
// algo-derm's solver does normalize(key) + an exact Map lookup against the INCI
// tokens, so each ingredient is keyed twice for the best chance of binding:
//   - the name: gets algo-derm's FR→Latin translation ("Acide Azélaïque").
//   - the slug with hyphens→spaces, English INCI-ish, binds actives whose
//     French name never matches the token ("salicylic-acid" → "salicylic acid").
// Hyphens must become spaces because normalize() keeps them. Measured bind:
// name-only 64% → name+slug 73% over the curated corpus.
//
// Only %-unit rows in (0, 100] are pinned, IU/mg/mcg are not concentrations,
// and the solver clamps but a 0%/negative claim would break feasibility.

export type ConcentrationRow = {
  name: string
  slug?: string
  concentrationValue: string | number | null
  concentrationUnit: string | null
}

export function buildKnownConcentrations(
  rows: readonly ConcentrationRow[]
): Record<string, number> {
  const map: Record<string, number> = {}
  for (const row of rows) {
    if (row.concentrationUnit !== '%' || row.concentrationValue === null) continue
    const pct = Number(row.concentrationValue)
    if (!Number.isFinite(pct) || pct <= 0 || pct > 100) continue
    map[row.name] = pct
    if (row.slug) map[row.slug.replace(/-/g, ' ')] = pct
  }
  return map
}
