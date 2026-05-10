import { timestamp } from 'drizzle-orm/pg-core'

// Standard `created_at` / `updated_at` columns shared across most tables.
// `mode: 'string'` keeps timestamps as ISO 8601 strings end-to-end (see docs/archi/dates-convention.md).
// Spread into a pgTable definition: `pgTable('foo', { id: ..., ...timestamps })`.
export const timestamps = {
  createdAt: timestamp('created_at', { withTimezone: true, mode: 'string' }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true, mode: 'string' })
    .notNull()
    .defaultNow()
    .$onUpdate(() => new Date().toISOString()),
}
