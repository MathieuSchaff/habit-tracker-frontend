// Generic helpers shared by every tag domain.
//
// Each domain declares one source-of-truth array of tag definitions
// (`*_TAG_DEFS`) carrying {key, slug, category[, label, subgroup]} per tag. These
// helpers derive the runtime views shared by products and ingredients so the
// declared vocabulary cannot drift from its consumers.

type TagDef<C extends string = string> = {
  readonly key: string
  readonly slug: string
  readonly category: C
}

export type LabeledTagDef<C extends string = string> = TagDef<C> & {
  readonly label: string
}

export type ProductTagDef<C extends string = string> = LabeledTagDef<C> & {
  readonly subgroup?: string
}

// Map a defs array to its `{KEY: slug}` object, preserving each key->slug pair as
// a distinct literal (const type param) so `SLUGS.RETINOIDS` stays `'retinoids'`,
// not the wide union. Key order follows defs order.
export function deriveTagSlugs<const T extends readonly { key: string; slug: string }[]>(
  defs: T
): { [K in T[number] as K['key']]: K['slug'] } {
  const out: Record<string, string> = {}
  for (const def of defs) out[def.key] = def.slug
  return out as { [K in T[number] as K['key']]: K['slug'] }
}

export function buildTagLabels<S extends string>(
  defs: readonly { slug: S; label: string }[]
): Record<S, string> {
  const out = {} as Record<S, string>
  for (const def of defs) out[def.slug] = def.label
  return out
}

// Ingredient taxonomy is `{category}`-only (no label in shared).
export function buildTagCategoryMap<S extends string, C extends string>(
  defs: readonly { slug: S; category: C }[]
): Record<S, { category: C }> {
  const out = {} as Record<S, { category: C }>
  for (const def of defs) out[def.slug] = { category: def.category }
  return out
}

// Product taxonomy carries both category and display label. Its key order
// follows defs order, which is the canonical order declared by each domain.
export function buildProductTagTaxonomy<S extends string, C extends string>(
  defs: readonly { slug: S; category: C; label: string }[]
): Record<S, { category: C; label: string }> {
  const out = {} as Record<S, { category: C; label: string }>
  for (const def of defs) {
    out[def.slug] = { category: def.category, label: def.label }
  }
  return out
}

// Display sub-groups (e.g. concern functional/aesthetic). Picks only defs whose
// subgroup is in `groups`; order follows defs order within each group.
export function buildTagSubgroups<S extends string, G extends string>(
  defs: readonly { slug: S; subgroup?: string }[],
  groups: readonly G[]
): Record<G, readonly S[]> {
  const out = {} as Record<G, S[]>
  for (const group of groups) out[group] = []
  for (const def of defs) {
    if (def.subgroup === undefined) continue
    const bucket = out[def.subgroup as G]
    if (bucket) bucket.push(def.slug)
  }
  return out
}

export function sortFilterCategories<C extends string>(
  categories: readonly C[],
  meta: Record<C, { order: number }>
): C[] {
  return [...categories].sort((a, b) => meta[a].order - meta[b].order)
}
