-- Drop `type-outil` product_type_v2 slug.
-- Decision 2026-05-11 (ROADMAP §8): no `gua-sha` / `jade-roller` /
-- `cleansing-brush` kind exists in PRODUCT_KINDS and zero products are tagged
-- `type-outil` (legacy `outil-massage` product_type was dropped by 0047).
-- Retire the slug rather than extend PRODUCT_KINDS for products that don't
-- exist in the pipeline. Re-add if/when a real tool catalogue lands.

DELETE FROM "tag_products"
WHERE "product_tag_id" IN (
  SELECT "id" FROM "product_tags" WHERE "slug" = 'type-outil'
);
--> statement-breakpoint
DELETE FROM "product_tags" WHERE "slug" = 'type-outil';
