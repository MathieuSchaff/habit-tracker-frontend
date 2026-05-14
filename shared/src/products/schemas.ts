import { z } from 'zod'

import { fieldChangeSchema, safeUrl } from '../core'
import { PRODUCT_CATEGORY_VALUES, PRODUCT_KINDS } from './kinds'
import { PRODUCT_TEXTURE_VALUES } from './textures'
import { PRODUCT_AMOUNT_UNIT_VALUES, PRODUCT_UNIT_VALUES } from './units'

// Soft validation: rejects HTML and bare prose (no comma for strings > 100 chars).
// Does not attempt full INCI nomenclature parsing — algo-derm handles that at
// processing time.
const inciBase = z
  .string()
  .max(5000)
  .refine((v) => !/<[^>]+>/.test(v), { message: 'inci must not contain HTML' })
  .refine((v) => v.trim().length <= 100 || v.includes(','), {
    message: 'inci must be a comma-separated ingredient list',
  })

export const createProductSchema = z
  .object({
    name: z.string().min(1).max(200),
    brand: z.string().min(1).max(200),
    category: z.enum(PRODUCT_CATEGORY_VALUES),
    kind: z.string().min(1).max(100),
    unit: z.enum(PRODUCT_UNIT_VALUES),
    slug: z.string().max(100).optional(),
    inci: inciBase.optional(),
    description: z.string().max(5000).optional(),
    totalAmount: z.number().int().min(1).optional(),
    amountUnit: z.enum(PRODUCT_AMOUNT_UNIT_VALUES).optional(),
    texture: z.enum(PRODUCT_TEXTURE_VALUES).optional(),
    url: safeUrl.optional(),
    imageUrl: safeUrl.optional(),
    notes: z.string().max(5000).optional(),
    priceCents: z.number().int().min(0).optional(),
  })
  .refine(
    (d) => {
      const validKinds = PRODUCT_KINDS[d.category as keyof typeof PRODUCT_KINDS]
      return validKinds ? Object.values(validKinds).includes(d.kind as never) : false
    },
    { message: 'kind is not valid for the given category' }
  )

export const updateProductSchema = z
  .object({
    name: z.string().min(1).max(200).optional(),
    brand: z.string().min(1).max(200).optional(),
    category: z.enum(PRODUCT_CATEGORY_VALUES).optional(),
    kind: z.string().min(1).max(100).optional(),
    unit: z.enum(PRODUCT_UNIT_VALUES).optional(),
    slug: z.string().max(100).optional(),
    inci: inciBase.nullable().optional(),
    description: z.string().max(5000).nullable().optional(),
    totalAmount: z.number().int().min(1).nullable().optional(),
    amountUnit: z.enum(PRODUCT_AMOUNT_UNIT_VALUES).nullable().optional(),
    texture: z.enum(PRODUCT_TEXTURE_VALUES).nullable().optional(),
    url: safeUrl.nullable().optional(),
    imageUrl: safeUrl.nullable().optional(),
    notes: z.string().max(5000).nullable().optional(),
    priceCents: z.number().int().min(0).nullable().optional(),
  })
  .strict()
  .superRefine((d, ctx) => {
    const hasCategory = d.category !== undefined
    const hasKind = d.kind !== undefined
    if (hasCategory !== hasKind) {
      ctx.addIssue({
        code: 'custom',
        message: 'category and kind must be updated together',
        path: [hasCategory ? 'kind' : 'category'],
      })
      return
    }
    if (d.category !== undefined && d.kind !== undefined) {
      const validKinds = PRODUCT_KINDS[d.category]
      if (!validKinds || !Object.values(validKinds).includes(d.kind as never)) {
        ctx.addIssue({
          code: 'custom',
          message: 'kind is not valid for the given category',
          path: ['kind'],
        })
      }
    }
  })

const editableProductFields = {
  name: fieldChangeSchema(z.string()),
  brand: fieldChangeSchema(z.string()),
  category: fieldChangeSchema(z.enum(PRODUCT_CATEGORY_VALUES)),
  kind: fieldChangeSchema(z.string()),
  unit: fieldChangeSchema(z.enum(PRODUCT_UNIT_VALUES)),
  slug: fieldChangeSchema(z.string()),
  inci: fieldChangeSchema(z.string()),
  description: fieldChangeSchema(z.string()),
  totalAmount: fieldChangeSchema(z.number().int()),
  amountUnit: fieldChangeSchema(z.enum(PRODUCT_AMOUNT_UNIT_VALUES)),
  texture: fieldChangeSchema(z.enum(PRODUCT_TEXTURE_VALUES)),
  url: fieldChangeSchema(safeUrl),
  imageUrl: fieldChangeSchema(safeUrl),
  notes: fieldChangeSchema(z.string()),
  priceCents: fieldChangeSchema(z.number().int()),
  updatedAt: fieldChangeSchema(z.iso.datetime()),
}

export const productChangesSchema = z
  .object(editableProductFields)
  .partial()
  .refine((data) => Object.keys(data).length > 0, {
    message: 'At least one field change is required',
  })

export const searchProductsQuery = z.object({
  q: z.string().trim().min(1).max(100),
  limit: z.coerce.number().int().min(1).max(20).default(8),
  offset: z.coerce.number().int().min(0).default(0),
})

// Comma-separated UUIDs in query string (kept GET-friendly so it can be used
// as a TanStack Query key without serializing a body). Cap at 50 ids — covers
// any realistic comparison/picker batch and keeps the URL bounded.
export const productsByIdsQuery = z.object({
  ids: z
    .string()
    .transform((s) => s.split(',').filter(Boolean))
    .pipe(z.array(z.uuid()).min(1).max(50)),
})

export const patentSchema = z.object({
  name: z.string(), // 'Rosactiv 2.0'
  description: z
    .string()
    .transform((v) => (v.trim() === '' ? null : v))
    .nullable()
    .optional(),
  // si url = "" =>  ZodError => sucess est false=>  l'update échoue
  // { name: "Rosactiv", url: "" } =>   ZodError =>  update bloqué
  url: z.preprocess((v) => (v === '' ? null : v), safeUrl.nullable().optional()),
})
