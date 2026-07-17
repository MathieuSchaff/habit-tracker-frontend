# @aurore/shared

The contract package. Zod schemas + inferred types + small domain helpers, consumed by
both `backend/` and `frontend/` through a single root barrel (`@aurore/shared`). Hono RPC
gives end-to-end types off this surface — no codegen.

Layout: one folder per domain (`auth/`, `products/`, `ingredients/`, …). A domain is either
a single `index.ts` (most) or, when it earns the size, split into leaf files re-exported by
its `index.ts` (`products/`, `ingredients/`).

## Conventions (load-bearing — keep these)

1. **Root barrel is `export *` per domain, never a hand list.** `src/index.ts` re-exports
   each domain with `export * from './<domain>'`. The domain `index.ts` is the **sole curator**
   of its public surface. A hand-enumerated root list is a second source of truth that drifts —
   don't reintroduce one. No cross-domain name collisions exist (the `Product*`/`Ingredient*`
   prefix convention holds); the compiler guards future ones.

2. **One file under ~200 lines.** A domain with <3 functional areas stays a single
   `index.ts`, sectioned with `// SCHEMAS` / `// TYPES` / `// HELPERS` (see `auth/`, `profile/`,
   `blog/`, `tag-api/`). Split into `schemas.ts`/`types.ts`/`helpers.ts` only once size warrants it
   (`products/`, `ingredients/`) — the split should signal real size, not style.

3. **One `*_TAG_DEFS` array is the source of truth per domain.** Each `<cat>/tag-slugs.ts`
   declares `*_TAG_DEFS` = `{key, slug, category}` per tag (products also carry `label` and an
   optional display `subgroup`; ingredient labels live in the seed, not here). The `*_TAG_SLUGS`
   object, labels, taxonomy and display sub-groups are all **derived** from it (see #4) — a tag's
   slug+label+category is read in one place and the rest can't drift. Cross-entity slugs shared
   between a product and ingredient taxonomy live in one shared defs sub-array spread into both:
   `SHARED_SKINCARE_ACTIF_CLASS_DEFS` (owned by `ingredients/skincare/tag-slugs.ts`) is spread
   into the skincare product defs, which add product-only extras (`urea`). Drift fails to compile.

4. **Generic tag helpers are neutral.** `tag-taxonomy-builder.ts` holds the derive helpers
   (`deriveTagSlugs`, `buildTagLabels`, `buildTagCategoryMap`, `buildProductTagTaxonomy`,
   `buildTagSubgroups`, `sortFilterCategories`) — reachable by both `products/` and
   `ingredients/` without a products↔ingredients import cycle. `deriveTagSlugs` uses a `const`
   type param so `SLUGS.KEY` keeps its literal slug type. Per-domain `tag-taxonomy.ts` only calls
   these on its `*_TAG_DEFS`; `tag-filters.ts` declares the `*_TAG_CATEGORY_META` record and calls
   `sortFilterCategories`. The `*_TAG_CATEGORIES` array and its `*TagCategory` type live in
   `tag-slugs.ts` (the defs need the category union).

5. **`tag-api/` is the tag HTTP CRUD surface, not the vocabulary.** It holds the relevance/source
   enums, create/update/replace schemas, and error mapping. The tag *vocabulary* is the
   `*_TAG_DEFS` array in `products|ingredients/<cat>/tag-slugs.ts`; `tag-taxonomy.ts` only derives
   from it. Don't put slug taxonomy in `tag-api/`.

6. **Tree-shaking is fine through the barrel.** Rolldown isolates the large taxonomy consts
   into a lazy chunk (auth routes ship 0 B of it). `sideEffects:false` is not required.

7. **Product filter presentation crosses one interface.**
   `getProductFilterDefinition(domain)` returns complete, ordered, React-independent group
   definitions: metadata, final option order, and named sub-groups. Frontend adapters may add
   runtime `count` / `disabled` state, but must not reconstruct category META, ordering policy,
   or subgroup labels. The per-domain `tag-filters.ts` modules and skincare subgroup maps are
   implementation details behind this interface and are not re-exported from `@aurore/shared`.
