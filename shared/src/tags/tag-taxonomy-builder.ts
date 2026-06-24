// Generic helpers shared by every product domain taxonomy.
// Domain files declare buckets (slug arrays per category) + a labels dict;
// these helpers turn that into the runtime taxonomy and the sorted filter
// category list, without each domain redeclaring `buildEntries` / sort code.

export function buildTagTaxonomy<S extends string, C extends string>(
  labels: Record<S, string>,
  buckets: Record<C, readonly S[]>
): Record<S, { category: C; label: string }> {
  const out = {} as Record<S, { category: C; label: string }>
  for (const category of Object.keys(buckets) as C[]) {
    for (const slug of buckets[category]) {
      out[slug] = { category, label: labels[slug] }
    }
  }
  return out
}

export function sortFilterCategories<C extends string>(
  categories: readonly C[],
  meta: Record<C, { order: number }>
): C[] {
  return [...categories].sort((a, b) => meta[a].order - meta[b].order)
}
