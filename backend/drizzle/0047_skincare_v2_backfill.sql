-- Skincare V2 backfill (consolidated): insert V2 product_tag definitions,
-- propagate legacy product_type / routine_step associations to their V2
-- equivalents, then drop legacy associations + defs.
--
-- Idempotent end-to-end (ON CONFLICT DO NOTHING). Replaces 0044/0045 which
-- were marked applied but ran on an empty DB; the snapshot loaded afterwards
-- reintroduced the legacy rows without any V2 backfill.

-- ─── Step 1: insert V2 defs (product_type_v2, texture, routine_step_v2,
--                            routine_moment, zone-pieds) ───────────────
INSERT INTO product_tags (id, slug, label, type) VALUES
  (uuidv7(), 'type-nettoyant',    'Nettoyant',          'product_type_v2'),
  (uuidv7(), 'type-toner',        'Toner',              'product_type_v2'),
  (uuidv7(), 'type-mist',         'Mist / Brume',       'product_type_v2'),
  (uuidv7(), 'type-serum',        'Sérum / Concentré',  'product_type_v2'),
  (uuidv7(), 'type-hydratant',    'Hydratant',          'product_type_v2'),
  (uuidv7(), 'type-masque',       'Masque',             'product_type_v2'),
  (uuidv7(), 'type-exfoliation',  'Exfoliation',        'product_type_v2'),
  (uuidv7(), 'type-solaire',      'Protection solaire', 'product_type_v2'),
  (uuidv7(), 'type-traitement',   'Traitement ciblé',   'product_type_v2'),
  (uuidv7(), 'type-primer',       'Base de maquillage', 'product_type_v2'),
  (uuidv7(), 'type-deodorant',    'Déodorant',          'product_type_v2'),
  (uuidv7(), 'type-outil',        'Outil',              'product_type_v2'),
  (uuidv7(), 'texture-gel',       'Gel',                'texture'),
  (uuidv7(), 'texture-creme',     'Crème',              'texture'),
  (uuidv7(), 'texture-baume',     'Baume',              'texture'),
  (uuidv7(), 'texture-huile',     'Huile',              'texture'),
  (uuidv7(), 'texture-lait',      'Lait',               'texture'),
  (uuidv7(), 'texture-mousse',    'Mousse',             'texture'),
  (uuidv7(), 'texture-eau',       'Eau',                'texture'),
  (uuidv7(), 'texture-patch',     'Patch',              'texture'),
  (uuidv7(), 'texture-stick',     'Stick',              'texture'),
  (uuidv7(), 'step-nettoyage-1',        '1er nettoyage',     'routine_step_v2'),
  (uuidv7(), 'step-nettoyage-2',        '2e nettoyage',      'routine_step_v2'),
  (uuidv7(), 'step-preparation',        'Préparation',       'routine_step_v2'),
  (uuidv7(), 'step-traitement',         'Traitement',        'routine_step_v2'),
  (uuidv7(), 'step-hydratation',        'Hydratation',       'routine_step_v2'),
  (uuidv7(), 'step-occlusif',           'Occlusif',          'routine_step_v2'),
  (uuidv7(), 'step-protection-solaire', 'Protection solaire','routine_step_v2'),
  (uuidv7(), 'moment-matin',           'Matin',           'routine_moment'),
  (uuidv7(), 'moment-soir',            'Soir',            'routine_moment'),
  (uuidv7(), 'moment-hebdomadaire',    'Hebdomadaire',    'routine_moment'),
  (uuidv7(), 'moment-usage-localise',  'Usage localisé',  'routine_moment'),
  (uuidv7(), 'moment-crise',           'En cas de crise', 'routine_moment'),
  (uuidv7(), 'zone-pieds',             'Pieds',           'skin_zone')
ON CONFLICT (slug) DO NOTHING;
--> statement-breakpoint

-- ─── Step 2: backfill product_type → product_type_v2 ────────────────────
WITH map(legacy, v2) AS (VALUES
  ('baume-demaquillant',     'type-nettoyant'),
  ('huile-demaquillante',    'type-nettoyant'),
  ('huile-nettoyante',       'type-nettoyant'),
  ('gel-nettoyant',          'type-nettoyant'),
  ('mousse-nettoyante',      'type-nettoyant'),
  ('lait-nettoyant',         'type-nettoyant'),
  ('creme-nettoyante',       'type-nettoyant'),
  ('eau-micellaire',         'type-nettoyant'),
  ('nettoyant-corps',        'type-nettoyant'),
  ('tonique',                'type-toner'),
  ('lotion',                 'type-toner'),
  ('essence',                'type-toner'),
  ('brume',                  'type-mist'),
  ('serum',                  'type-serum'),
  ('ampoule',                'type-serum'),
  ('huile-visage',           'type-serum'),
  ('creme-hydratante',       'type-hydratant'),
  ('gel-creme',              'type-hydratant'),
  ('creme-de-nuit',          'type-hydratant'),
  ('baume',                  'type-hydratant'),
  ('lait-corps',             'type-hydratant'),
  ('creme-corps',            'type-hydratant'),
  ('huile-corps',            'type-hydratant'),
  ('creme-mains',            'type-hydratant'),
  ('creme-pieds',            'type-hydratant'),
  ('masque-argile',          'type-masque'),
  ('masque-tissu',           'type-masque'),
  ('masque-hydratant',       'type-masque'),
  ('sleeping-mask',          'type-masque'),
  ('patch',                  'type-masque'),
  ('exfoliant-chimique',     'type-exfoliation'),
  ('exfoliant-physique',     'type-exfoliation'),
  ('gommage-corps',          'type-exfoliation'),
  ('creme-solaire',          'type-solaire'),
  ('creme-solaire-teintee',  'type-solaire'),
  ('apres-soleil',           'type-solaire'),
  ('auto-bronzant',          'type-solaire'),
  ('spot-treatment',         'type-traitement'),
  ('contour-yeux',           'type-traitement'),
  ('soin-levres',            'type-traitement'),
  ('primer',                 'type-primer'),
  ('deodorant',              'type-deodorant'),
  ('outil-massage',          'type-outil')
)
INSERT INTO tag_products (product_id, product_tag_id, relevance)
SELECT tp.product_id, v2.id, tp.relevance
FROM tag_products tp
JOIN product_tags legacy ON legacy.id = tp.product_tag_id AND legacy.type = 'product_type'
JOIN map ON map.legacy = legacy.slug
JOIN product_tags v2 ON v2.slug = map.v2 AND v2.type = 'product_type_v2'
ON CONFLICT (product_tag_id, product_id) DO NOTHING;
--> statement-breakpoint

-- ─── Step 3: backfill product_type → skin_zone ──────────────────────────
WITH map(legacy, zone) AS (VALUES
  ('huile-visage',     'zone-visage'),
  ('lait-corps',       'zone-corps'),
  ('creme-corps',      'zone-corps'),
  ('huile-corps',      'zone-corps'),
  ('gommage-corps',    'zone-corps'),
  ('nettoyant-corps',  'zone-corps'),
  ('contour-yeux',     'zone-yeux'),
  ('soin-levres',      'zone-levres'),
  ('creme-mains',      'zone-mains'),
  ('creme-pieds',      'zone-pieds')
)
INSERT INTO tag_products (product_id, product_tag_id, relevance)
SELECT tp.product_id, z.id, tp.relevance
FROM tag_products tp
JOIN product_tags legacy ON legacy.id = tp.product_tag_id AND legacy.type = 'product_type'
JOIN map ON map.legacy = legacy.slug
JOIN product_tags z ON z.slug = map.zone AND z.type = 'skin_zone'
ON CONFLICT (product_tag_id, product_id) DO NOTHING;
--> statement-breakpoint

-- ─── Step 4: backfill product_type → texture ────────────────────────────
WITH map(legacy, texture) AS (VALUES
  ('gel-nettoyant',          'texture-gel'),
  ('gel-creme',              'texture-gel'),
  ('creme-nettoyante',       'texture-creme'),
  ('creme-hydratante',       'texture-creme'),
  ('creme-de-nuit',          'texture-creme'),
  ('creme-corps',            'texture-creme'),
  ('creme-mains',            'texture-creme'),
  ('creme-pieds',            'texture-creme'),
  ('creme-solaire',          'texture-creme'),
  ('creme-solaire-teintee',  'texture-creme'),
  ('baume',                  'texture-baume'),
  ('baume-demaquillant',     'texture-baume'),
  ('huile-demaquillante',    'texture-huile'),
  ('huile-nettoyante',       'texture-huile'),
  ('huile-visage',           'texture-huile'),
  ('huile-corps',            'texture-huile'),
  ('lait-nettoyant',         'texture-lait'),
  ('lait-corps',             'texture-lait'),
  ('mousse-nettoyante',      'texture-mousse'),
  ('eau-micellaire',         'texture-eau'),
  ('brume',                  'texture-eau'),
  ('tonique',                'texture-eau'),
  ('lotion',                 'texture-eau'),
  ('patch',                  'texture-patch')
)
INSERT INTO tag_products (product_id, product_tag_id, relevance)
SELECT tp.product_id, t.id, tp.relevance
FROM tag_products tp
JOIN product_tags legacy ON legacy.id = tp.product_tag_id AND legacy.type = 'product_type'
JOIN map ON map.legacy = legacy.slug
JOIN product_tags t ON t.slug = map.texture AND t.type = 'texture'
ON CONFLICT (product_tag_id, product_id) DO NOTHING;
--> statement-breakpoint

-- ─── Step 5: backfill routine_step → routine_step_v2 ────────────────────
WITH map(legacy, v2) AS (VALUES
  ('double-nettoyage-1',  'step-nettoyage-1'),
  ('double-nettoyage-2',  'step-nettoyage-2'),
  ('preparation',         'step-preparation'),
  ('traitement',          'step-traitement'),
  ('hydratation',         'step-hydratation'),
  ('emollience',          'step-hydratation'),
  ('protection-solaire',  'step-protection-solaire'),
  ('occlusion',           'step-occlusif'),
  ('soin-yeux',           'step-traitement'),
  ('soin-localise',       'step-traitement'),
  ('exfoliation',         'step-traitement')
)
INSERT INTO tag_products (product_id, product_tag_id, relevance)
SELECT tp.product_id, v2.id, tp.relevance
FROM tag_products tp
JOIN product_tags legacy ON legacy.id = tp.product_tag_id AND legacy.type = 'routine_step'
JOIN map ON map.legacy = legacy.slug
JOIN product_tags v2 ON v2.slug = map.v2 AND v2.type = 'routine_step_v2'
ON CONFLICT (product_tag_id, product_id) DO NOTHING;
--> statement-breakpoint

-- ─── Step 6: backfill routine_step → routine_moment ─────────────────────
WITH map(legacy, moment) AS (VALUES
  ('matin',               'moment-matin'),
  ('soir',                'moment-soir'),
  ('protection-solaire',  'moment-matin'),
  ('occlusion',           'moment-soir'),
  ('soin-localise',       'moment-usage-localise')
)
INSERT INTO tag_products (product_id, product_tag_id, relevance)
SELECT tp.product_id, m.id, tp.relevance
FROM tag_products tp
JOIN product_tags legacy ON legacy.id = tp.product_tag_id AND legacy.type = 'routine_step'
JOIN map ON map.legacy = legacy.slug
JOIN product_tags m ON m.slug = map.moment AND m.type = 'routine_moment'
ON CONFLICT (product_tag_id, product_id) DO NOTHING;
--> statement-breakpoint

-- ─── Step 7: drop legacy associations + tag definitions ─────────────────
-- Scoped by skincare-only legacy slug list to leave haircare/dental/supplement
-- product_type and haircare routine_step rows intact.
DELETE FROM tag_products
WHERE product_tag_id IN (
  SELECT id FROM product_tags WHERE type IN ('product_type','routine_step')
    AND slug IN (
      'baume-demaquillant','huile-demaquillante','huile-nettoyante','gel-nettoyant',
      'mousse-nettoyante','lait-nettoyant','creme-nettoyante','eau-micellaire',
      'tonique','essence','lotion','brume','primer','serum','ampoule','huile-visage',
      'spot-treatment','creme-hydratante','gel-creme','creme-de-nuit','baume',
      'sleeping-mask','contour-yeux','soin-levres','exfoliant-chimique',
      'exfoliant-physique','masque-argile','masque-tissu','masque-hydratant',
      'creme-solaire','creme-solaire-teintee','apres-soleil','auto-bronzant',
      'lait-corps','creme-corps','creme-mains','huile-corps','gommage-corps',
      'nettoyant-corps','deodorant','creme-pieds','patch','outil-massage',
      'matin','soir','nettoyant','double-nettoyage-1','double-nettoyage-2',
      'preparation','traitement','hydratation','emollience','protection-solaire',
      'occlusion','soin-yeux','soin-localise','exfoliation','masque-hebdo'
    )
);
--> statement-breakpoint
DELETE FROM product_tags
WHERE type IN ('product_type','routine_step')
  AND slug IN (
    'baume-demaquillant','huile-demaquillante','huile-nettoyante','gel-nettoyant',
    'mousse-nettoyante','lait-nettoyant','creme-nettoyante','eau-micellaire',
    'tonique','essence','lotion','brume','primer','serum','ampoule','huile-visage',
    'spot-treatment','creme-hydratante','gel-creme','creme-de-nuit','baume',
    'sleeping-mask','contour-yeux','soin-levres','exfoliant-chimique',
    'exfoliant-physique','masque-argile','masque-tissu','masque-hydratant',
    'creme-solaire','creme-solaire-teintee','apres-soleil','auto-bronzant',
    'lait-corps','creme-corps','creme-mains','huile-corps','gommage-corps',
    'nettoyant-corps','deodorant','creme-pieds','patch','outil-massage',
    'matin','soir','nettoyant','double-nettoyage-1','double-nettoyage-2',
    'preparation','traitement','hydratation','emollience','protection-solaire',
    'occlusion','soin-yeux','soin-localise','exfoliation','masque-hebdo'
  );
