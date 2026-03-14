import {
  type FieldChange,
  type IngredientChanges,
  ingredientChangesSchema,
  type ProductChanges,
  productChangesSchema,
} from '@habit-tracker/shared'

import type { ZodType } from 'zod'

import type { db } from '../db'
import { ingredientEdits, productEdits } from '../db/schema'

function areEqual(a: unknown, b: unknown): boolean {
  if (a instanceof Date && b instanceof Date) return a.getTime() === b.getTime()
  return a === b
}
// types

interface EditTableConfig<TChanges> {
  table: typeof productEdits | typeof ingredientEdits // ajoute tes futures tables ici
  entityIdColumn: string // 'product_id' | 'ingredient_id'
  schema: ZodType<TChanges>
}

// buildChanges (inchangé)

export function buildChanges(
  row: Record<string, unknown>,
  trackedFields: readonly string[],
  newEntity: Record<string, unknown>
): Record<string, FieldChange<unknown>> {
  const changes: Record<string, FieldChange<unknown>> = {}

  for (const key of trackedFields) {
    let oldVal = row[`old_${key}`]

    if (
      oldVal == null ||
      (typeof oldVal === 'object' && oldVal !== null && Object.keys(oldVal).length === 0)
    ) {
      oldVal = null
    }

    const newVal = newEntity[key] ?? null

    if (!areEqual(oldVal, newVal)) {
      changes[key] = { old: oldVal, new: newVal }
    }
  }

  return changes
}

// logEdit (générique)

export async function logEdit(
  database: typeof db,
  config: EditTableConfig<unknown>,
  params: {
    entityId: string
    editedBy: string
    summary: string | null
    changes: Record<string, FieldChange<unknown>>
  }
) {
  if (Object.keys(params.changes).length === 0) return

  const parsed = config.schema.parse(params.changes)

  await database.insert(config.table).values({
    [config.entityIdColumn]: params.entityId,
    editedBy: params.editedBy,
    summary: params.summary,
    changes: parsed,
  } as any) // as any car Drizzle ne peut pas inférer le type dynamiquement
}

// configs par entité

export const productEditConfig: EditTableConfig<ProductChanges> = {
  table: productEdits,
  entityIdColumn: 'productId',
  schema: productChangesSchema,
}

export const ingredientEditConfig: EditTableConfig<IngredientChanges> = {
  table: ingredientEdits,
  entityIdColumn: 'ingredientId',
  schema: ingredientChangesSchema,
}
