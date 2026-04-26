import { type ZodType, z } from 'zod'

type ParseResult<T> =
  | { ok: true; data: T }
  | { ok: false; fieldErrors: Record<string, string[] | undefined> }

export function parseAuthForm<T>(form: HTMLFormElement, schema: ZodType<T>): ParseResult<T> {
  const data = Object.fromEntries(new FormData(form))
  const result = schema.safeParse(data)
  if (!result.success) {
    return { ok: false, fieldErrors: z.flattenError(result.error).fieldErrors }
  }
  return { ok: true, data: result.data }
}
