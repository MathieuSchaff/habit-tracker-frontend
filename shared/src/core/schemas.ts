import { z } from 'zod'

// Shared tag item shape used in filter-options responses.
// `count` is optional so endpoints that don't aggregate (e.g. ingredient
// filter-options today) keep a plain shape; products endpoint populates it.
export const tagItemSchema = z.object({
  name: z.string(),
  slug: z.string(),
  count: z.number().int().nonnegative().optional(),
})

export const fieldChangeSchema = <T extends z.ZodTypeAny>(valueSchema: T) =>
  z.object({
    old: valueSchema.nullable(),
    new: valueSchema.nullable(),
  })

// Zod v4's z.url() accepts javascript: and data: protocols. This refine
// restricts to http/https to prevent XSS via <a href> or <img src>.
export const safeUrl = z
  .url()
  .max(2000)
  .refine((v) => /^https?:\/\//.test(v), { message: 'URL must use http or https protocol' })

// Stricter than safeUrl: catalog submissions must be https-only (no mixed
// content / protocol-downgrade on an https app). safeUrl stays http-tolerant
// for legacy/other surfaces.
export const httpsUrl = z
  .url()
  .max(2000)
  .refine((v) => /^https:\/\//.test(v), { message: 'URL must use https protocol' })

// Reject embedded markup in user-submitted free-text fields. Defense in depth
// against stored XSS, since these strings are rendered across the app.
export const noHtml = <T extends z.ZodString>(schema: T) =>
  schema.refine((v) => !/<[^>]+>/.test(v), { message: 'must not contain HTML' })
