-- Drop marketing sensation slugs (`fini-glowy`, `absorption-rapide`).
-- `fini-glowy` = subjective dewy finish, gold set verdict 2026-05-09 = non
-- confirmable from INCI alone (audit AUTO-TAGS.md ligne 1093). 14 paires DB.
-- `absorption-rapide` = co-emitted with `non-gras` from identical trigger
-- (silicone top 5 + 0 vegetable oil top 5). Sémantique distincte mais pattern
-- duplicate — merged into `non-gras` only. 60 paires DB.

DELETE FROM "tag_products"
WHERE "product_tag_id" IN (
  SELECT "id" FROM "product_tags"
  WHERE "slug" IN ('fini-glowy', 'absorption-rapide')
);
--> statement-breakpoint
DELETE FROM "product_tags"
WHERE "slug" IN ('fini-glowy', 'absorption-rapide');
