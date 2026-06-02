import { pgEnum, timestamp, uuid } from 'drizzle-orm/pg-core'

import { users } from './auth/users'

// 'unverified' = user-submitted, shown publicly but flagged as not yet curated.
// 'verified' = created/blessed by a contributor or admin (the legacy curated seed
// is backfilled to this). Orthogonal to moderation_status (quality vs visibility).
export const catalogQualityEnum = pgEnum('catalog_quality', ['unverified', 'verified'])

// Spread into a catalog table (products, ingredients) to opt it into the
// submission workflow. verified_by/at are NULL for unverified rows and for the
// legacy backfill (a verified row MAY have NULL stamps, see the verify CHECK).
export const catalogQualityColumns = {
  catalogQuality: catalogQualityEnum('catalog_quality').notNull().default('unverified'),
  verifiedBy: uuid('verified_by').references(() => users.id, { onDelete: 'set null' }),
  verifiedAt: timestamp('verified_at', { withTimezone: true, mode: 'string' }),
}
