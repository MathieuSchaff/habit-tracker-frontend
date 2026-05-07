import { logger } from '../lib/logger'

// Runtime guard for service → API mappers. In dev/test we Zod-parse the
// outgoing shape so a forgotten calendar↔instant conversion or a stale field
// surfaces immediately. In prod we trust the TypeScript contract — the parse
// would add measurable latency on hot read paths.

const isDev = process.env.NODE_ENV !== 'production'

interface SafeParser<T> {
  safeParse(value: unknown): { success: true; data: T } | { success: false; error: unknown }
}

export function devAssertSchema<T>(schema: SafeParser<T>, value: T, context: string): T {
  if (!isDev) return value
  const result = schema.safeParse(value)
  if (!result.success) {
    logger.error({ err: result.error, context, value }, 'devAssertSchema mismatch')
    throw new Error(`devAssertSchema(${context}): response shape drift — see logs`)
  }
  return result.data
}
