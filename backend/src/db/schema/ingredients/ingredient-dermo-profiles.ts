import { boolean, integer, pgEnum, pgTable, text, uuid } from 'drizzle-orm/pg-core'

import { ingredients } from './ingredients'

export const irritationEnum = pgEnum('irritation_potential', ['low', 'moderate', 'high'])

export const ingredientDermoProfiles = pgTable('ingredient_dermo_profiles', {
  ingredientId: uuid('ingredient_id')
    .primaryKey()
    .references(() => ingredients.id, { onDelete: 'cascade' })
    .notNull()
    .unique(),
  irritationPotential: irritationEnum('irritation_potential').default('low'),
  comedogenicity: integer('comedogenicity'), // 0-5
  isFiller: boolean('is_filler').default(false),
  functions: text('functions').array().notNull().default([]),
  skinTargets: text('skin_targets').array().notNull().default([]),
})

export type IngredientDermoProfile = typeof ingredientDermoProfiles.$inferSelect
export type IngredientDermoProfileInsert = typeof ingredientDermoProfiles.$inferInsert
