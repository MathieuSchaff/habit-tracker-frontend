-- Skincare-only refactor: collapse product_label + shared_label axes into a
-- single product_characteristic axis with display-only sub-groups (tolerance /
-- ethique / technique / comedogenicite). Scoped by slug list since these slugs
-- have no DB usage outside the skincare tab (skincare/solaire/bodycare); the
-- haircare/dental/supplement taxonomies have been cleaned up to drop these slugs.

UPDATE product_tags
SET type = 'product_characteristic'
WHERE type IN ('product_label', 'shared_label')
  AND slug IN (
    'sans-parfum',
    'sans-savon',
    'hypoallergenique',
    'grossesse-compatible',
    'bio-naturel',
    'vegan',
    'cruelty-free',
    'filtres-mineraux',
    'filtres-chimiques',
    'pigments-verts',
    'comedogene',
    'non-comedogene'
  );
