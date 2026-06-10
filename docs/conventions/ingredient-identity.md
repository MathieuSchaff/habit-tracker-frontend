# Ingredient identity — `canonical_key`

> Read before reasoning about "is ingredient X the same substance as Y", deduping
> ingredients, or grouping `product_ingredients`.

## The problem

`ingredients.slug` is **not** a substance identity. The catalogue grew from several
imports that each used a different slug scheme for the *same* substance:

| scheme | example (all = castor oil) |
|--------|----------------------------|
| English | `castor-oil` |
| French `huile-*` | `huile-ricin` |
| INCI | `ricinus-communis-seed-oil` |
| `-hair` shadow | `castor-oil-hair` |

`-hair` rows are **shadow duplicates** the haircare import created so haircare-specific
tags/dermo attach without touching the base entry. They are shared with genuine haircare
products → cannot be renamed or deleted. String-munging (`<x>-hair → <x>`) both under- and
over-counts; it cannot resolve identity.

## The column

`ingredients.canonical_key text` (migration `0097`) = algo-derm's `evidence.inci` — the
curated canonical INCI name. Every alias of one substance resolves to the **same** key:

```
glycerin        \
glycerin-hair    >--->  "Glycerin"
                /
argan-oil-hair  \
huile-argan      >--->  "Argania Spinosa Kernel Oil"
```

- **Source of truth:** algo-derm `lookupIngredient(name, buildAliasIndex(MERGED_EVIDENCE_DB))`.
  Not a hand-kept map — it rides algo-derm's curated alias/normalize/botanical-strip logic.
- **Best-effort, NULL when unmatched.** ~50% resolved; the rest (FR / exotic botanicals
  algo-derm doesn't curate) stay NULL. This is **not a completeness contract** —
  `product_ingredients` is a curated optional subset, an unkeyed ingredient is a coverage
  nit, not a broken link.
- **Identity ≠ catalogue row.** A key can exist with no bare canonical ingredient
  (`sles-hair` → `Sodium Laureth Sulfate`, no SLES row). The key still groups it.
- **Non-destructive.** No row is renamed, merged, or deleted; shadows stay put.

## How to use it

- **Reason identity off `canonical_key`, never the slug.** "Same substance?" = same non-NULL
  key. Two NULLs are *not* equal (unknown ≠ unknown).
- Group/dedup with `GROUP BY canonical_key` (index `ingredients_canonical_key_idx`).
- Display still uses `slug`/`name` — `canonical_key` is an internal identity, not a label.

## Maintenance

- **Re-run after a fresh seed or an algo-derm bump:**
  `WRITE=1 just catalog-backfill-canonical-key` then `just db-snapshot`.
- `just db-seed` already re-runs the backfill (seed inserts leave the column NULL).
- The backfill resets the column first, so it reflects the current algo-derm evidence DB —
  a dropped alias drops its key.

Script: `backend/src/db/seed/maintenance/backfill-canonical-key.ts`.
