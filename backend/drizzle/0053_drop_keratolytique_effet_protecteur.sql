-- Drop redundant skin_effect product slugs (`keratolytique`, `effet-protecteur`).
-- Round 2 taxonomy audit 2026-05-09 (AUTO-TAGS.md §F3):
-- * `keratolytique` algo-derm trigger = subset of AHA + BHA + RETINOIDS + urea
--   actif_class clusters. 595 paires DB; 53% strict overlap with the existing
--   actif_class trio. Pharmacological identity not user-facing — kept at
--   ingredient_tags level for chemistry classification.
-- * `effet-protecteur` Trigger B (≥ 2 butter/wax) delegated to detectTextureRiche
--   so 74% of emissions co-fired with `texture-riche`. Trigger A (lanolin top 8)
--   covered ~24 niche balm products with weak signal vs occlusif/texture-riche.
--   93 paires DB. Slug felt fourre-tout per editorial review.
-- Ingredient-side slugs (SKINCARE_INGREDIENT_TAG_SLUGS) and ingredient_tags rows
-- stay intact — pharmacological/chemical classification keeps meaning at
-- ingredient level.

DELETE FROM "tag_products"
WHERE "product_tag_id" IN (
  SELECT "id" FROM "product_tags"
  WHERE "slug" IN ('keratolytique', 'effet-protecteur')
);
--> statement-breakpoint
DELETE FROM "product_tags"
WHERE "slug" IN ('keratolytique', 'effet-protecteur');
