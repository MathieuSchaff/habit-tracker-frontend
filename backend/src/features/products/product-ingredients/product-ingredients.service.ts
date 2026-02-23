import { and, eq, getTableColumns } from 'drizzle-orm'

import type { Database } from '../../../db/index'
import { ingredients } from '../../../db/schema/ingredients'
import { type ProductIngredient, productIngredients } from '../../../db/schema/product-ingredients'
import { type Product, products } from '../../../db/schema/products'

type CreateProductIngredientInput = Omit<ProductIngredient, 'id' | 'createdAt'>

type UpdateProductIngredientInput = Partial<
  Pick<ProductIngredient, 'concentrationValue' | 'concentrationUnit' | 'concentrationPer' | 'notes'>
>

export async function addIngredientToProduct(db: Database, data: CreateProductIngredientInput) {
  const [link] = await db.insert(productIngredients).values(data).returning()
  return link
}

export async function addManyIngredientsToProduct(
  db: Database,
  data: CreateProductIngredientInput[]
): Promise<ProductIngredient[]> {
  if (data.length === 0) return []
  return db.insert(productIngredients).values(data).returning()
}

/**
 * Liste les ingrédients d'un produit avec les infos de l'ingrédient jointé.
 */
export async function listIngredientsByProduct(db: Database, productId: string) {
  return db
    .select({
      id: productIngredients.id,
      productId: productIngredients.productId,
      ingredientId: productIngredients.ingredientId,
      concentrationValue: productIngredients.concentrationValue,
      concentrationUnit: productIngredients.concentrationUnit,
      concentrationPer: productIngredients.concentrationPer,
      notes: productIngredients.notes,
      createdAt: productIngredients.createdAt,
      // Joined ingredient fields
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

/**
 * Liste les produits contenant un ingrédient donné.
 */
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

/**
 * Remplace tous les ingrédients d'un produit (transaction).
 */
export async function replaceProductIngredients(
  db: Database,
  productId: string,
  data: Omit<CreateProductIngredientInput, 'productId'>[]
): Promise<ProductIngredient[]> {
  return db.transaction(async (tx) => {
    await tx.delete(productIngredients).where(eq(productIngredients.productId, productId))

    if (data.length === 0) return []

    return tx
      .insert(productIngredients)
      .values(data.map((d) => ({ ...d, productId })))
      .returning()
  })
}
