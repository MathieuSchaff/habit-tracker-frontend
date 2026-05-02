-- Drop legacy skincare routine_step axis (15 slugs).
-- Replaced by routine_step_v2 + routine_moment (backfilled 2026-05-02).
-- Scoped by slug list to leave haircare routine_step untouched.

DELETE FROM "tag_products"
WHERE "product_tag_id" IN (
  SELECT "id" FROM "product_tags"
  WHERE "type" = 'routine_step'
    AND "slug" IN (
      'matin','soir','nettoyant','double-nettoyage-1','double-nettoyage-2',
      'preparation','traitement','hydratation','emollience','protection-solaire',
      'occlusion','soin-yeux','soin-localise','exfoliation','masque-hebdo'
    )
);
--> statement-breakpoint
DELETE FROM "product_tags"
WHERE "type" = 'routine_step'
  AND "slug" IN (
    'matin','soir','nettoyant','double-nettoyage-1','double-nettoyage-2',
    'preparation','traitement','hydratation','emollience','protection-solaire',
    'occlusion','soin-yeux','soin-localise','exfoliation','masque-hebdo'
  );
