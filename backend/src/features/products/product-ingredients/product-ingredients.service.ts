import { and, eq, getTableColumns } from 'drizzle-orm'

import type { Database, DB } from '../../../db/index'
import { ingredients } from '../../../db/schema/ingredients'
import { type ProductIngredient, productIngredients } from '../../../db/schema/product-ingredients'
import { type Product, products } from '../../../db/schema/products'

type CreateProductIngredientInput = {
  productId: string
  ingredientId: string
  notes?: string | null
  concentrationValue?: string | null
  concentrationUnit?: string | null
  concentrationPer?: string | null
}

type UpdateProductIngredientInput = Partial<
  Pick<ProductIngredient, 'concentrationValue' | 'concentrationUnit' | 'concentrationPer' | 'notes'>
>

export async function addIngredientToProduct(db: DB, data: CreateProductIngredientInput) {
  // I remove null and empty strings so Drizzle does not send bad data to the database
  const entries = Object.entries(data).filter(([_, v]) => v != null && v !== '')
  const cleanData = Object.fromEntries(entries) as CreateProductIngredientInput

  const [link] = await db.insert(productIngredients).values(cleanData).returning()
  return link
}
export async function addManyIngredientsToProduct(
  db: Database,
  data: CreateProductIngredientInput[]
): Promise<ProductIngredient[]> {
  if (data.length === 0) return []
  return db.insert(productIngredients).values(data).returning()
}

export async function listIngredientsByProduct(db: Database, productId: string) {
  return db
    .select({
      productId: productIngredients.productId,
      ingredientId: productIngredients.ingredientId,
      concentrationValue: productIngredients.concentrationValue,
      concentrationUnit: productIngredients.concentrationUnit,
      concentrationPer: productIngredients.concentrationPer,
      notes: productIngredients.notes,
      ingredientName: ingredients.name,
      ingredientSlug: ingredients.slug,
      ingredientCategory: ingredients.category,
      ingredientDescription: ingredients.description,
    })
    .from(productIngredients)
    .innerJoin(ingredients, eq(productIngredients.ingredientId, ingredients.id))
    .where(eq(productIngredients.productId, productId))
    .orderBy(ingredients.name)
}

export async function listProductsByIngredient(
  db: Database,
  ingredientId: string
): Promise<Product[]> {
  return db
    .select(getTableColumns(products))
    .from(productIngredients)
    .innerJoin(products, eq(productIngredients.productId, products.id))
    .where(eq(productIngredients.ingredientId, ingredientId))
    .orderBy(products.name)
}

export async function updateProductIngredient(
  db: Database,
  productId: string,
  ingredientId: string,
  data: UpdateProductIngredientInput
): Promise<ProductIngredient | undefined> {
  const [link] = await db
    .update(productIngredients)
    .set(data)
    .where(
      and(
        eq(productIngredients.productId, productId),
        eq(productIngredients.ingredientId, ingredientId)
      )
    )
    .returning()
  return link
}

export async function removeIngredientFromProduct(
  db: Database,
  productId: string,
  ingredientId: string
): Promise<boolean> {
  const result = await db
    .delete(productIngredients)
    .where(
      and(
        eq(productIngredients.productId, productId),
        eq(productIngredients.ingredientId, ingredientId)
      )
    )
    .returning({ id: productIngredients.id })
  return result.length > 0
}

export async function replaceProductIngredients(
  db: Database,
  productId: string,
  data: Omit<CreateProductIngredientInput, 'productId'>[]
): Promise<ProductIngredient[]> {
  // We use a transaction because we must delete everything before we insert the new list
  return db.transaction(async (tx) => {
    await tx.delete(productIngredients).where(eq(productIngredients.productId, productId))

    if (data.length === 0) return []

    return tx
      .insert(productIngredients)
      .values(data.map((d) => ({ ...d, productId })))
      .returning()
  })
}
