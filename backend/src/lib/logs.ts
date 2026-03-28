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
import { areEqual } from './helpers'

interface EditTableConfig<TChanges> {
  table: typeof productEdits | typeof ingredientEdits // I can add more tables here later if needed
  entityIdColumn: string
  schema: ZodType<TChanges>
}

export function buildChanges(
  row: Record<string, unknown>,
  trackedFields: readonly string[],
  newEntity: Record<string, unknown>
): Record<string, FieldChange<unknown>> {
  const changes: Record<string, FieldChange<unknown>> = {}

  for (const key of trackedFields) {
    // I use the old_ prefix because the SQL result gives columns with this name.
    let oldVal = row[`old_${key}`]

    // If it's an empty object, I prefer to say it is null to be simple.
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
  } as any) // I use "as any" because Drizzle is lost with the dynamic column name.
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
