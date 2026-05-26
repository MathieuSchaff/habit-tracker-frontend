-- Rename tag definition tables: suffix _types makes the role unambiguous
ALTER TABLE "ingredient_tags" RENAME TO "ingredient_tag_types";
ALTER TABLE "product_tags" RENAME TO "product_tag_types";

-- Rename join tables: suffix _links distinguishes from definition tables
ALTER TABLE "tag_ingredients" RENAME TO "ingredient_tag_links";
ALTER TABLE "tag_products" RENAME TO "product_tag_links";

-- Rename indexes to match new table names
ALTER INDEX "ingredient_tags_slug_unique" RENAME TO "ingredient_tag_types_slug_unique";
ALTER INDEX "ingredient_tags_type_idx" RENAME TO "ingredient_tag_types_type_idx";
ALTER INDEX "product_tags_slug_unique" RENAME TO "product_tag_types_slug_unique";
ALTER INDEX "product_tags_type_idx" RENAME TO "product_tag_types_type_idx";
