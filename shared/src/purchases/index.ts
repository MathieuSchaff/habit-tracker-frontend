import { z } from 'zod'

import { HTTP_STATUS, type HttpStatus } from '../core'

// SCHEMAS

const dateString = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Format YYYY-MM-DD requis')

export const addPurchaseSchema = z.object({
  purchasedAt: dateString,
  pricePaidCents: z.number().int().min(0).optional(),
  expiresAt: dateString.optional(),
})

export const openPurchaseSchema = z.object({
  openedAt: dateString,
})

export const finishPurchaseSchema = z.object({
  finishedAt: dateString,
})

export const updatePurchaseSchema = z.object({
  purchasedAt: dateString.optional(),
  pricePaidCents: z.number().int().min(0).nullable().optional(),
})

export const purchaseSchema = z.object({
  id: z.uuid(),
  userProductId: z.uuid(),
  purchasedAt: z.string(),
  pricePaidCents: z.number().int().min(0).nullable(),
  openedAt: z.string().nullable(),
  finishedAt: z.string().nullable(),
  expiresAt: z.string().nullable(),
  createdAt: z.string(),
})

// TYPES

export type AddPurchaseInput = z.infer<typeof addPurchaseSchema>
export type OpenPurchaseInput = z.infer<typeof openPurchaseSchema>
export type FinishPurchaseInput = z.infer<typeof finishPurchaseSchema>
export type UpdatePurchaseInput = z.infer<typeof updatePurchaseSchema>
export type Purchase = z.infer<typeof purchaseSchema>

export type PurchaseErrorCode =
  | 'purchase_not_found'
  | 'active_purchase_exists'
  | 'no_active_purchase'
  | 'user_product_not_found'
  | 'purchase_creation_failed'

// HELPERS

export const purchaseErrorMapping = {
  purchase_not_found: HTTP_STATUS.NOT_FOUND,
  active_purchase_exists: HTTP_STATUS.CONFLICT,
  no_active_purchase: HTTP_STATUS.NOT_FOUND,
  user_product_not_found: HTTP_STATUS.NOT_FOUND,
  purchase_creation_failed: HTTP_STATUS.BAD_REQUEST,
} as const satisfies Record<PurchaseErrorCode, HttpStatus>
