import { timestamp } from 'drizzle-orm/pg-core'

// `mode: 'string'` keeps timestamps as ISO 8601 strings end-to-end.
export const timestamps = {
  createdAt: timestamp('created_at', { withTimezone: true, mode: 'string' }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true, mode: 'string' })
    .notNull()
    .defaultNow()
    .$onUpdate(() => new Date().toISOString()),
}
