-- Stale texture-creme cleanup (F2 — Path 2 kind-driven default).
-- Removes all tag_products pairs for `texture-creme` except `hand-cream`
-- (deterministic kind-tag, always correct by definition).
--
-- Legacy blanket mapping (_archive/auto-tag.ts) had tagged all moisturizer,
-- sunscreen, body-lotion, eye-cream as texture-creme regardless of INCI.
-- Distribution at cleanup: sunscreen 402, moisturizer 600, body-lotion 23,
-- eye-cream 2, other mistags 17, hand-cream 19 = 1063 non-hand-cream pairs.
--
-- After this migration, backfill re-creates correct pairs for moisturizer (676)
-- and foot-cream (6) via the new Path 2 default-with-veto detector.
-- Net result after backfill: ~701 pairs (vs 1069 legacy).

DELETE FROM "tag_products"
WHERE "product_tag_id" = (SELECT "id" FROM "product_tags" WHERE "slug" = 'texture-creme')
  AND "product_id" IN (
    SELECT "id" FROM "products" WHERE "kind" != 'hand-cream'
  );
