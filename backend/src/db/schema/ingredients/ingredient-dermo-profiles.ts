import { sql } from 'drizzle-orm'
import { boolean, check, integer, pgEnum, pgTable, text, uuid } from 'drizzle-orm/pg-core'

import { ingredients } from './ingredients'

export const irritationEnum = pgEnum('irritation_potential', ['low', 'moderate', 'high'])

export const ingredientDermoProfiles = pgTable(
  'ingredient_dermo_profiles',
  {
    ingredientId: uuid('ingredient_id')
      .primaryKey()
      .references(() => ingredients.id, { onDelete: 'cascade' }),
    irritationPotential: irritationEnum('irritation_potential').notNull().default('low'),
    // nullable: computed from user reviews, unknown until enough data
    comedogenicity: integer('comedogenicity'),
    isFiller: boolean('is_filler').notNull().default(false),
    functions: text('functions').array().notNull().default([]),
    skinTargets: text('skin_targets').array().notNull().default([]),
  },
  (t) => [check('comedogenicity_range', sql`${t.comedogenicity} BETWEEN 0 AND 5`)]
)

export type IngredientDermoProfile = typeof ingredientDermoProfiles.$inferSelect
export type IngredientDermoProfileInsert = typeof ingredientDermoProfiles.$inferInsert
