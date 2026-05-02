-- Drop legacy skincare product_type axis (43 slugs).
-- Replaced by product_type_v2 + texture + skin_zone (backfilled 2026-05-02).
-- Scoped by slug list to leave haircare/dental/supplement product_type untouched.

DELETE FROM "tag_products"
WHERE "product_tag_id" IN (
  SELECT "id" FROM "product_tags"
  WHERE "type" = 'product_type'
    AND "slug" IN (
      'baume-demaquillant','huile-demaquillante','huile-nettoyante',
      'gel-nettoyant','mousse-nettoyante','lait-nettoyant','creme-nettoyante',
      'eau-micellaire','tonique','essence','lotion','brume','primer',
      'serum','ampoule','huile-visage','spot-treatment','creme-hydratante',
      'gel-creme','creme-de-nuit','baume','sleeping-mask','contour-yeux',
      'soin-levres','exfoliant-chimique','exfoliant-physique','masque-argile',
      'masque-tissu','masque-hydratant','creme-solaire','creme-solaire-teintee',
      'apres-soleil','auto-bronzant','lait-corps','creme-corps','creme-mains',
      'huile-corps','gommage-corps','nettoyant-corps','deodorant','creme-pieds',
      'patch','outil-massage'
    )
);
--> statement-breakpoint
DELETE FROM "product_tags"
WHERE "type" = 'product_type'
  AND "slug" IN (
    'baume-demaquillant','huile-demaquillante','huile-nettoyante',
    'gel-nettoyant','mousse-nettoyante','lait-nettoyant','creme-nettoyante',
    'eau-micellaire','tonique','essence','lotion','brume','primer',
    'serum','ampoule','huile-visage','spot-treatment','creme-hydratante',
    'gel-creme','creme-de-nuit','baume','sleeping-mask','contour-yeux',
    'soin-levres','exfoliant-chimique','exfoliant-physique','masque-argile',
    'masque-tissu','masque-hydratant','creme-solaire','creme-solaire-teintee',
    'apres-soleil','auto-bronzant','lait-corps','creme-corps','creme-mains',
    'huile-corps','gommage-corps','nettoyant-corps','deodorant','creme-pieds',
    'patch','outil-massage'
  );
