import { zValidator as zv } from '@hono/zod-validator'
import type { ValidationTargets } from 'hono'
import { z } from 'zod'

// Field keys aren't statically known here (schema is the generic T), so
// fieldErrors is string-indexed rather than per-field.
type ValidationDetails = { formErrors: string[]; fieldErrors: Record<string, string[]> }

// Reshape validation 400s to our { error, details } convention: a stable
// `invalid_input` code + per-field messages in details, instead of leaking a
// raw ZodError into the typed RPC response.
export const zValidator = <T extends z.ZodType, Target extends keyof ValidationTargets>(
  target: Target,
  schema: T
) =>
  zv(target, schema, (result, c) => {
    if (!result.success) {
      const details: ValidationDetails = z.flattenError(result.error)
      return c.json({ success: false as const, error: 'invalid_input' as const, details }, 400)
    }
  })
