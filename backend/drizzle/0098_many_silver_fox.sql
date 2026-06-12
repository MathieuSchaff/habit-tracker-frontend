CREATE EXTENSION IF NOT EXISTS unaccent;--> statement-breakpoint
-- Two-arg unaccent pins the dictionary: the one-arg form resolves it through
-- search_path at call time, which breaks under restricted search_path and
-- makes the IMMUTABLE marking unsound for the expression indexes below.
CREATE OR REPLACE FUNCTION search_norm(text) RETURNS text
  LANGUAGE sql IMMUTABLE PARALLEL SAFE
  AS $$ SELECT lower(trim(regexp_replace(public.unaccent('public.unaccent'::regdictionary, $1), '\s+', ' ', 'g'))) $$;--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "ingredients_name_search_norm_trgm_idx" ON "ingredients" USING gin (search_norm("name") gin_trgm_ops);--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "ingredients_slug_search_norm_trgm_idx" ON "ingredients" USING gin (search_norm("slug") gin_trgm_ops);--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "products_name_search_norm_trgm_idx" ON "products" USING gin (search_norm("name") gin_trgm_ops);--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "products_brand_search_norm_trgm_idx" ON "products" USING gin (search_norm("brand") gin_trgm_ops);
