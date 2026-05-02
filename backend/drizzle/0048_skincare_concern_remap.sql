-- Skincare concern remap: legacy slugs → V2 buckets per the new taxonomy.
-- Inserts V2 concern defs (idempotent), reassociates tag_products, drops
-- legacy defs. Some V2 buckets merge multiple legacy slugs (e.g.
-- rougeurs-vasculaires <- anti-rougeurs + rosacee + couperose + flushs).

-- ─── Step 1: V2 concern defs ────────────────────────────────────────────
INSERT INTO product_tags (id, slug, label, type) VALUES
  (uuidv7(), 'acne-imperfections',     'Acné / Imperfections',  'concern'),
  (uuidv7(), 'rougeurs-vasculaires',   'Rougeurs vasculaires',  'concern'),
  (uuidv7(), 'eczema-atopie',          'Eczéma / Atopie',       'concern'),
  (uuidv7(), 'reparation-cutanee',     'Réparation',            'concern'),
  (uuidv7(), 'eclat-teint-uniforme',   'Éclat / Teint uniforme','concern'),
  (uuidv7(), 'pores-sebum',            'Pores / Sébum',         'concern'),
  (uuidv7(), 'protection',             'Protection',            'concern')
ON CONFLICT (slug) DO NOTHING;
--> statement-breakpoint

-- ─── Step 2: reassociate tag_products legacy → V2 ───────────────────────
WITH map(legacy, v2) AS (VALUES
  -- Acné / Imperfections
  ('anti-acne',                'acne-imperfections'),
  ('post-acne',                'acne-imperfections'),
  ('grain-peau',               'acne-imperfections'),
  -- Rougeurs vasculaires
  ('anti-rougeurs',            'rougeurs-vasculaires'),
  ('rosacee',                  'rougeurs-vasculaires'),
  ('couperose',                'rougeurs-vasculaires'),
  ('flushs',                   'rougeurs-vasculaires'),
  -- Eczéma / Atopie
  ('eczema',                   'eczema-atopie'),
  -- Barrière cutanée (target slug already exists, just reassoc legacy)
  ('microbiome',               'barriere-cutanee'),
  ('barriere-cutanee-alteree', 'barriere-cutanee'),
  -- Hyperpigmentation (target exists)
  ('anti-taches',              'hyperpigmentation'),
  -- Réparation
  ('cicatrisation',            'reparation-cutanee'),
  -- Éclat / Teint uniforme
  ('eclat',                    'eclat-teint-uniforme'),
  ('teint-terne',              'eclat-teint-uniforme'),
  -- Anti-âge (target exists)
  ('photo-vieillissement',     'anti-age'),
  -- Pores / Sébum
  ('pores-dilates',            'pores-sebum'),
  ('brillance',                'pores-sebum'),
  -- Protection environnementale
  ('pollution',                'protection'),
  ('lumiere-bleue',            'protection'),
  ('photo-protection',         'protection')
)
INSERT INTO tag_products (product_id, product_tag_id, relevance)
SELECT tp.product_id, v2.id, tp.relevance
FROM tag_products tp
JOIN product_tags legacy ON legacy.id = tp.product_tag_id AND legacy.type = 'concern'
JOIN map ON map.legacy = legacy.slug
JOIN product_tags v2 ON v2.slug = map.v2 AND v2.type = 'concern'
ON CONFLICT (product_tag_id, product_id) DO NOTHING;
--> statement-breakpoint

-- ─── Step 3: drop legacy concern slugs ──────────────────────────────────
DELETE FROM tag_products
WHERE product_tag_id IN (
  SELECT id FROM product_tags WHERE type = 'concern' AND slug IN (
    'anti-acne','post-acne','grain-peau',
    'anti-rougeurs','rosacee','couperose','flushs',
    'eczema',
    'microbiome','barriere-cutanee-alteree',
    'anti-taches',
    'cicatrisation',
    'eclat','teint-terne',
    'photo-vieillissement',
    'pores-dilates','brillance',
    'pollution','lumiere-bleue','photo-protection'
  )
);
--> statement-breakpoint
DELETE FROM product_tags
WHERE type = 'concern' AND slug IN (
  'anti-acne','post-acne','grain-peau',
  'anti-rougeurs','rosacee','couperose','flushs',
  'eczema',
  'microbiome','barriere-cutanee-alteree',
  'anti-taches',
  'cicatrisation',
  'eclat','teint-terne',
  'photo-vieillissement',
  'pores-dilates','brillance',
  'pollution','lumiere-bleue','photo-protection'
);
