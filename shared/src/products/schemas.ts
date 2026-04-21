import { z } from 'zod'

import { fieldChangeSchema } from '../core'
import { PRODUCT_CATEGORY_VALUES, PRODUCT_KINDS } from './kinds'
import { PRODUCT_UNIT_VALUES } from './units'

const uuid = z.uuid()

export const createProductSchema = z
  .object({
    name: z.string().min(1).max(200),
    brand: z.string().min(1).max(200),
    category: z.enum(PRODUCT_CATEGORY_VALUES),
    kind: z.string().min(1).max(100),
    unit: z.enum(PRODUCT_UNIT_VALUES),
    slug: z.string().max(100).optional(),
    inci: z.string().max(5000).optional(),
    description: z.string().max(5000).optional(),
    totalAmount: z.number().int().min(1).optional(),
    amountUnit: z.string().min(1).max(50).optional(),
    url: z.url().max(2000).optional(),
    imageUrl: z.url().max(2000).optional(),
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
    inci: z.string().max(5000).nullable().optional(),
    description: z.string().max(5000).nullable().optional(),
    totalAmount: z.number().int().min(1).nullable().optional(),
    amountUnit: z.string().min(1).max(50).nullable().optional(),
    url: z.url().max(2000).nullable().optional(),
    imageUrl: z.url().max(2000).nullable().optional(),
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
    if (hasCategory && hasKind) {
      const validKinds = PRODUCT_KINDS[d.category!]
      if (!validKinds || !Object.values(validKinds).includes(d.kind as never)) {
        ctx.addIssue({
          code: 'custom',
          message: 'kind is not valid for the given category',
          path: ['kind'],
        })
      }
    }
  })

export const productResponseSchema = z.object({
  id: uuid,
  createdBy: uuid,
  name: z.string(),
  slug: z.string(),
  brand: z.string(),
  category: z.enum(PRODUCT_CATEGORY_VALUES).nullable(),
  kind: z.string(),
  unit: z.enum(PRODUCT_UNIT_VALUES),
  inci: z.string().nullable(),
  description: z.string().nullable(),
  totalAmount: z.number().int().nullable(),
  amountUnit: z.string().nullable(),
  url: z.string().nullable(),
  imageUrl: z.string().nullable(),
  notes: z.string().nullable(),
  priceCents: z.number().int().nullable(),
  createdAt: z.date(),
  updatedAt: z.date(),
})

export const productEditResponseSchema = z.object({
  id: uuid,
  productId: uuid,
  editedBy: uuid,
  changes: z.record(
    z.string(),
    z.object({
      old: z.string().nullable(),
      new: z.string().nullable(),
    })
  ),
  summary: z.string().nullable(),
  createdAt: z.date(),
})

export const productsPageSchema = z.object({
  items: z.array(productResponseSchema),
  total: z.number().int(),
  page: z.number().int(),
  limit: z.number().int(),
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
  amountUnit: fieldChangeSchema(z.string()),
  url: fieldChangeSchema(z.url()),
  imageUrl: fieldChangeSchema(z.url()),
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
})
