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
   `blog/`, `tags/`). Split into `schemas.ts`/`types.ts`/`helpers.ts` only once size warrants it
   (`products/`, `ingredients/`) — the split should signal real size, not style.

3. **Cross-entity slugs have one source.** Slugs shared between a product and an ingredient
   taxonomy live in one const, spread into both. Example: `SHARED_SKINCARE_ACTIF_CLASS_SLUGS`
   is owned by `ingredients/skincare/tag-slugs.ts` (actif_class = molecule property); the
   product taxonomy spreads it and adds product-only extras (`urea`). Drift fails to compile.

4. **Generic tag-taxonomy helpers are neutral.** `buildTagTaxonomy` / `sortFilterCategories`
   live in `tags/tag-taxonomy-builder.ts` — reachable by both `products/` and `ingredients/`
   without a products↔ingredients import cycle. Per-domain `tag-filters.ts` declare data
   (the `*_TAG_CATEGORY_META` record) and call the shared helper; they don't re-implement it.

5. **Tree-shaking is fine through the barrel.** Rolldown isolates the large taxonomy consts
   into a lazy chunk (auth routes ship 0 B of it). `sideEffects:false` is not required.