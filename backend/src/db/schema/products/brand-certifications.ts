import { sql } from 'drizzle-orm'
import { boolean, jsonb, pgTable, text, timestamp } from 'drizzle-orm/pg-core'

// Brand-level claims (vegan / cruelty-free / natural-or-organic certified)
// keyed by `lower(trim(brand))`. Brands are free-text on `products.brand` —
// no FK. Detector joins by normalized brand so casing/whitespace drift
// between sources never breaks the lookup.
//
// `sources` records provenance per claim so we can re-ingest one source
// (OBF, PETA, Leaping Bunny, Cosmos…) without losing the others. Empty
// array for a claim means the claim is currently false; non-empty = true
// at the row level (mirrored in the boolean columns for fast filter).

export type BrandCertificationSource =
  | 'manual'
  | 'obf'
  | 'peta'
  | 'leaping-bunny'
  | 'cosmos'
  | 'ecocert'
  | 'nature-progres'
  | 'vegan-society'

export interface BrandCertificationSources {
  vegan?: BrandCertificationSource[]
  cruelty_free?: BrandCertificationSource[]
  natural?: BrandCertificationSource[]
}

export const brandCertifications = pgTable('brand_certifications', {
  brandNormalized: text('brand_normalized').primaryKey(),
  brandDisplay: text('brand_display').notNull(),
  isVegan: boolean('is_vegan').notNull().default(false),
  isCrueltyFree: boolean('is_cruelty_free').notNull().default(false),
  isNaturalCertified: boolean('is_natural_certified').notNull().default(false),
  sources: jsonb('sources').$type<BrandCertificationSources>().notNull().default(sql`'{}'::jsonb`),
  notes: text('notes'),
  updatedAt: timestamp('updated_at', { withTimezone: true, mode: 'string' })
    .notNull()
    .defaultNow()
    .$onUpdate(() => new Date().toISOString()),
})

export type BrandCertification = typeof brandCertifications.$inferSelect
export type BrandCertificationInsert = typeof brandCertifications.$inferInsert

export function normalizeBrand(raw: string): string {
  return raw.trim().replace(/\s+/g, ' ').toLowerCase()
}
