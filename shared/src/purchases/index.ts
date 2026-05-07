import { z } from 'zod'

import { HTTP_STATUS, type HttpStatus } from '../core'

// SCHEMAS

// Calendar dates (purchasedAt, openedAt, finishedAt, expiresAt) travel as full
// ISO datetime UTC strings on the wire. Backend boundary truncates to YYYY-MM-DD
// for the underlying `date` column. See the date convention in CLAUDE.md.
const instantSchema = z.iso.datetime()

export const addPurchaseSchema = z.object({
  purchasedAt: instantSchema,
  pricePaidCents: z.number().int().min(0).optional(),
  expiresAt: instantSchema.optional(),
})

export const openPurchaseSchema = z.object({
  openedAt: instantSchema,
})

export const finishPurchaseSchema = z.object({
  finishedAt: instantSchema,
})

export const updatePurchaseSchema = z.object({
  purchasedAt: instantSchema.optional(),
  pricePaidCents: z.number().int().min(0).nullable().optional(),
})

export const purchaseSchema = z.object({
  id: z.uuid(),
  userProductId: z.uuid(),
  purchasedAt: instantSchema,
  pricePaidCents: z.number().int().min(0).nullable(),
  openedAt: instantSchema.nullable(),
  finishedAt: instantSchema.nullable(),
  expiresAt: instantSchema.nullable(),
  createdAt: instantSchema,
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
