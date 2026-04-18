import { z } from 'zod'

import { fieldChangeSchema, tagItemSchema } from '../core'
import { PRODUCT_CATEGORY_VALUES } from './kinds'

const uuid = z.uuid()

export const createProductSchema = z.object({
  name: z.string().min(1).max(200),
  brand: z.string().min(1).max(200),
  category: z.enum(PRODUCT_CATEGORY_VALUES).nullable().optional(),
  kind: z.string().min(1).max(100),
  unit: z.string().min(1).max(50),
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

export const updateProductSchema = z
  .object({
    name: z.string().min(1).max(200).optional(),
    brand: z.string().min(1).max(200).optional(),
    category: z.enum(PRODUCT_CATEGORY_VALUES).nullable().optional(),
    kind: z.string().min(1).max(100).optional(),
    unit: z.string().min(1).max(50).optional(),
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

export const productResponseSchema = z.object({
  id: uuid,
  createdBy: uuid,
  name: z.string(),
  slug: z.string(),
  brand: z.string(),
  category: z.enum(PRODUCT_CATEGORY_VALUES).nullable(),
  kind: z.string(),
  unit: z.string(),
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

export const filterOptionsSchema = z.object({
  kinds: z.array(z.string()),
  brands: z.array(z.string()),
  tags: z.object({
    routine_step: z.array(tagItemSchema),
    skin_type: z.array(tagItemSchema),
    skin_zone: z.array(tagItemSchema),
    product_type: z.array(tagItemSchema),
    concern: z.array(tagItemSchema),
    // Attributs ex-'attribute' éclatés en 3 seaux distincts :
    //   - skin_effect   : rendu sur peau (matifiant, occlusif, repulpant, …)
    //   - product_label : labels de formulation (sans-parfum, vegan, …)
    //   - shared_label  : labels molécule+produit (comedogene, non-comedogene)
    skin_effect: z.array(tagItemSchema),
    product_label: z.array(tagItemSchema),
    shared_label: z.array(tagItemSchema),
  }),
})

export const productsPageSchema = z.object({
  items: z.array(productResponseSchema),
  total: z.number().int(),
  page: z.number().int(),
  limit: z.number().int(),
})

export const listProductsQuery = z.object({
  kind: z.string().optional(),
  brand: z.string().optional(),
  routine_step: z.string().optional(),
  skin_type: z.string().optional(),
  concern: z.string().optional(),
  product_type: z.string().optional(),
  ingredient: z.string().optional(),
  skin_zone: z.string().optional(),
  skin_effect: z.string().optional(),
  product_label: z.string().optional(),
  shared_label: z.string().optional(),
  avoid_for: z.string().optional(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  sort: z.enum(['name', 'random']).optional(),
})

const editableProductFields = {
  name: fieldChangeSchema(z.string()),
  brand: fieldChangeSchema(z.string()),
  category: fieldChangeSchema(z.enum(PRODUCT_CATEGORY_VALUES)),
  kind: fieldChangeSchema(z.string()),
  unit: fieldChangeSchema(z.string()),
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
