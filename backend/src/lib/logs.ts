import {
  type FieldChange,
  type IngredientChanges,
  ingredientChangesSchema,
  type ProductChanges,
  productChangesSchema,
} from '@habit-tracker/shared'

import type { ZodType } from 'zod'

import type { DB } from '../db'
import { ingredientEdits, productEdits } from '../db/schema'
import { areEqual } from './helpers'

interface EditTableConfig<TChanges> {
  table: typeof productEdits | typeof ingredientEdits // I can add more tables here later if needed
  entityIdColumn: string
  schema: ZodType<TChanges>
}

export function buildChanges(
  oldEntity: Record<string, unknown>,
  newEntity: Record<string, unknown>,
  trackedFields: readonly string[]
): Record<string, FieldChange<unknown>> {
  const changes: Record<string, FieldChange<unknown>> = {}

  for (const key of trackedFields) {
    let oldVal = oldEntity[key]

    // Treat empty object as null so the diff stays simple.
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

export async function logEdit(
  database: DB,
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
    // biome-ignore lint/suspicious/noExplicitAny: Drizzle loses types with dynamic column names
  } as any)
}

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
