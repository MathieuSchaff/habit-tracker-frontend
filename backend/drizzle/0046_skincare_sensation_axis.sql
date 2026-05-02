-- Split skincare skin_effect: move sensorial slugs to a new `sensation` type
-- and seed 4 new sensation slugs. Keeps OCCLUSIF/MATIFIANT/etc on skin_effect
-- (now labeled "Actions / Effets" in the UI).

UPDATE "product_tags"
SET "type" = 'sensation'
WHERE "type" = 'skin_effect'
  AND "slug" IN ('texture-riche','texture-legere');
--> statement-breakpoint
INSERT INTO "product_tags" ("id","slug","label","type") VALUES
  (uuidv7(), 'non-gras',          'Non gras',          'sensation'),
  (uuidv7(), 'fini-mat',          'Fini mat',          'sensation'),
  (uuidv7(), 'fini-glowy',        'Fini glowy',        'sensation'),
  (uuidv7(), 'absorption-rapide', 'Absorption rapide', 'sensation')
ON CONFLICT (slug) DO NOTHING;
