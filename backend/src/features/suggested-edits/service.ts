import type { CreateSuggestedEditInput, SuggestedEditStatus } from '@aurore/shared'
import { PROPOSABLE_FIELDS } from '@aurore/shared'

import { desc, eq } from 'drizzle-orm'

import type { Database } from '../../db'
import { ingredients, products, suggestedEdits } from '../../db/schema'
import { translateUniqueViolation } from '../../lib/catalog'
import { nowISO } from '../../utils/dates'
import { ProductError } from '../products/product-error'
import { SuggestedEditError } from './suggested-edit-error'

// Mirror createProduct/updateProduct normalization so dedup keys stay consistent.
const normalizeString = (s: string) => s.trim().replace(/\s+/g, ' ')

export async function createSuggestedEdit(
  db: Database,
  args: { proposerId: string; body: CreateSuggestedEditInput }
) {
  const [row] = await db
    .insert(suggestedEdits)
    .values({
      proposerId: args.proposerId,
      targetType: args.body.targetType,
      targetId: args.body.targetId,
      field: args.body.field,
      proposedValue: args.body.proposedValue,
    })
    .returning()

  if (!row) throw new SuggestedEditError('server_error')
  return row
}

export async function listSuggestedEdits(db: Database, filters: { status?: SuggestedEditStatus }) {
  const rows = filters.status
    ? await db
        .select()
        .from(suggestedEdits)
        .where(eq(suggestedEdits.status, filters.status))
        .orderBy(desc(suggestedEdits.createdAt))
    : await db.select().from(suggestedEdits).orderBy(desc(suggestedEdits.createdAt))
  return { items: rows }
}

// name/brand can collide with products_name_brand_unique_visible, normalize +
// re-throw the 23505 so withRlsContext rolls back (catch-and-return on an aborted
// tx would COMMIT it → spurious 500).
function applyToSheet(
  db: Database,
  edit: {
    targetType: 'product' | 'ingredient'
    targetId: string
    field: string
    proposedValue: string
  }
) {
  const allowed = PROPOSABLE_FIELDS[edit.targetType] as readonly string[]
  if (!allowed.includes(edit.field)) throw new SuggestedEditError('invalid_input')

  if (edit.targetType === 'product') {
    const value =
      edit.field === 'name' || edit.field === 'brand'
        ? normalizeString(edit.proposedValue)
        : edit.proposedValue
    return db
      .update(products)
      .set({ [edit.field]: value } as Record<string, string>)
      .where(eq(products.id, edit.targetId))
      .returning({ id: products.id })
      .catch((e) => translateUniqueViolation(e, () => new ProductError('product_already_exists')))
  }
  const value = edit.field === 'name' ? normalizeString(edit.proposedValue) : edit.proposedValue
  return db
    .update(ingredients)
    .set({ [edit.field]: value } as Record<string, string>)
    .where(eq(ingredients.id, edit.targetId))
    .returning({ id: ingredients.id })
}

export async function reviewSuggestedEdit(
  db: Database,
  args: { id: string; reviewerId: string; status: 'accepted' | 'rejected' }
) {
  const [edit] = await db.select().from(suggestedEdits).where(eq(suggestedEdits.id, args.id))
  if (!edit) throw new SuggestedEditError('not_found')
  if (edit.status !== 'pending') throw new SuggestedEditError('invalid_input')

  if (args.status === 'accepted') {
    const applied = await applyToSheet(db, {
      targetType: edit.targetType,
      targetId: edit.targetId,
      field: edit.field,
      proposedValue: edit.proposedValue,
    })
    if (!applied || applied.length === 0) throw new SuggestedEditError('not_found')
  }

  // Write ONLY status/reviewedBy/reviewedAt, never field/proposedValue/proposerId.
  const [row] = await db
    .update(suggestedEdits)
    .set({ status: args.status, reviewedBy: args.reviewerId, reviewedAt: nowISO() })
    .where(eq(suggestedEdits.id, args.id))
    .returning()

  if (!row) throw new SuggestedEditError('not_found')
  return row
}
