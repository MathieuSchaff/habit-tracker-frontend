import { z } from 'zod'

import { noHtml } from '../core'

export const editTargetTypeSchema = z.enum(['product', 'ingredient'])
export type EditTargetType = z.infer<typeof editTargetTypeSchema>

export const suggestedEditStatusSchema = z.enum(['pending', 'accepted', 'rejected'])
export type SuggestedEditStatus = z.infer<typeof suggestedEditStatusSchema>

// The scalar sheet fields a user may propose a correction for. brand/inci are
// product-only (ingredients have neither column); slug is never proposable.
export const PROPOSABLE_FIELDS = {
  product: ['name', 'brand', 'inci', 'description'],
  ingredient: ['name', 'description'],
} as const satisfies Record<EditTargetType, readonly string[]>

const inciValidator = noHtml(z.string().max(5000)).refine(
  (v) => v.trim().length <= 100 || v.includes(','),
  { message: 'inci must be a comma-separated ingredient list' }
)
const fieldValidators = {
  product: {
    name: noHtml(z.string().trim().min(2).max(200)),
    brand: noHtml(z.string().trim().min(2).max(200)),
    inci: inciValidator,
    description: noHtml(z.string().max(5000)),
  },
  ingredient: {
    name: noHtml(z.string().trim().min(2).max(200)),
    description: noHtml(z.string().max(2000)),
  },
} as const

export const createSuggestedEditBodySchema = z
  .object({
    targetType: editTargetTypeSchema,
    targetId: z.uuid(),
    field: z.string().trim().min(1).max(50),
    proposedValue: z.string().trim().min(1).max(5000),
  })
  .superRefine((data, ctx) => {
    const allowed = PROPOSABLE_FIELDS[data.targetType] as readonly string[]
    if (!allowed.includes(data.field)) {
      ctx.addIssue({
        code: 'custom',
        path: ['field'],
        message: `field "${data.field}" is not editable for ${data.targetType}`,
      })
      return
    }
    // allowed.includes guard above ensures the key exists.
    const validator = (fieldValidators[data.targetType] as Record<string, z.ZodType<string>>)[
      data.field
    ] as z.ZodType<string>
    const result = validator.safeParse(data.proposedValue)
    if (!result.success) {
      ctx.addIssue({
        code: 'custom',
        path: ['proposedValue'],
        message: result.error.issues[0]?.message ?? 'invalid value',
      })
    }
  })
export type CreateSuggestedEditInput = z.infer<typeof createSuggestedEditBodySchema>

export const reviewSuggestedEditBodySchema = z.object({
  status: z.enum(['accepted', 'rejected']),
})
export type ReviewSuggestedEditInput = z.infer<typeof reviewSuggestedEditBodySchema>

export const listSuggestedEditsQuerySchema = z.object({
  status: suggestedEditStatusSchema.optional(),
})
export type ListSuggestedEditsQuery = z.infer<typeof listSuggestedEditsQuerySchema>

export type SuggestedEditView = {
  id: string
  proposerId: string
  targetType: EditTargetType
  targetId: string
  field: string
  proposedValue: string
  status: SuggestedEditStatus
  reviewedBy: string | null
  reviewedAt: string | null
  createdAt: string
}

export type ListSuggestedEditsResponse = { items: SuggestedEditView[] }
