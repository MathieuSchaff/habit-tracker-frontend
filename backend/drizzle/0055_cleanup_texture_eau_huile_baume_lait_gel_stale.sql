-- F6 — Cleanup stale texture-* pairs from legacy blanket tagging.
-- Decisions Q1-Q6 (see backend/src/db/seed/docs/_archive/auto-tags-texture-postmortem.md §10):
--   Q1/Q2: rinse-off kinds (cleanser, body-wash) excluded from texture-*
--   Q3:    moisturizer baume covered by detectTextureBaumeFromName extension
--   Q4/Q5: 5 products get admin texture set (1 lait, 4 eau)
--   Q6:    gel scope unified — delete all non-deterministic, backfill recreates
--
-- Pattern (same as 0054 for texture-creme): preserve only the deterministic
-- kind-tag pairs, then backfill rebuilds via current detectors + admin field.
-- Deterministic kind-tag emitters preserved:
--   texture-eau   ← toner, mist
--   texture-huile ← oil, body-oil
--   texture-baume ← balm
--   texture-lait  ← body-lotion
--   texture-gel   ← (none — fully detector-driven, delete all)
--
-- Expected delta after migration + backfill:
--   eau   252 → ~228 (drop ~28 legacy mistags, +4 admin exfoliants)
--   huile  57 → ~27  (drop ~30 cleanser/body-wash mistags)
--   baume  76 → ~64  (drop legacy, +moisturizer baume from extended detector)
--   lait  105 → ~95  (drop legacy, +1 admin moisturizer milk)
--   gel   177 → ~108 (drop ~69 legacy mistags, INCI detector recreates legit)

-- ── Q4/Q5 admin texture for legitimate single-cases ──────────────────────────
UPDATE "products" SET "texture" = 'lait'
WHERE "slug" = 'prequel-urea-advance-relife-moisturizing-milk';

UPDATE "products" SET "texture" = 'eau'
WHERE "slug" IN (
  'svr-sebiaclear-micro-peel',
  'geek-gorgeous-calm-down',
  'geek-gorgeous-cheer-up',
  'geek-gorgeous-smooth-out'
);

-- ── Stale pair cleanup (preserve deterministic kind-tag emitters) ────────────
DELETE FROM "tag_products"
WHERE "product_tag_id" = (SELECT "id" FROM "product_tags" WHERE "slug" = 'texture-eau')
  AND "product_id" IN (
    SELECT "id" FROM "products" WHERE "kind" NOT IN ('toner', 'mist')
  );

DELETE FROM "tag_products"
WHERE "product_tag_id" = (SELECT "id" FROM "product_tags" WHERE "slug" = 'texture-huile')
  AND "product_id" IN (
    SELECT "id" FROM "products" WHERE "kind" NOT IN ('oil', 'body-oil')
  );

DELETE FROM "tag_products"
WHERE "product_tag_id" = (SELECT "id" FROM "product_tags" WHERE "slug" = 'texture-baume')
  AND "product_id" IN (
    SELECT "id" FROM "products" WHERE "kind" != 'balm'
  );

DELETE FROM "tag_products"
WHERE "product_tag_id" = (SELECT "id" FROM "product_tags" WHERE "slug" = 'texture-lait')
  AND "product_id" IN (
    SELECT "id" FROM "products" WHERE "kind" != 'body-lotion'
  );

DELETE FROM "tag_products"
WHERE "product_tag_id" = (SELECT "id" FROM "product_tags" WHERE "slug" = 'texture-gel');
