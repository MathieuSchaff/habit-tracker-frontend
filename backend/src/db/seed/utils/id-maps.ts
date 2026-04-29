import { db } from '../..'
import type { DB } from '../../index'
import {
  articles,
  ingredients,
  ingredientTagsDefs,
  productIngredients,
  products,
  productTagsDefs,
  tagIngredients,
  tagProducts,
  userProductReviews,
  userProducts,
} from '../../schema'
import type { ProductTagGroups } from './batch'

export function flattenTagGroups(
  map: Record<string, ProductTagGroups>
): Array<{ slug: string; tagSlug: string; relevance: 'primary' | 'secondary' | 'avoid' }> {
  return Object.entries(map).flatMap(([slug, groups]) => [
    ...groups.primary.map((tagSlug) => ({ slug, tagSlug, relevance: 'primary' as const })),
    ...groups.secondary.map((tagSlug) => ({ slug, tagSlug, relevance: 'secondary' as const })),
    ...groups.avoid.map((tagSlug) => ({ slug, tagSlug, relevance: 'avoid' as const })),
  ])
}

export async function cleanDatabase(tx: DB = db) {
  console.log('🧹 Nettoyage de la base de données...')
  // Order matters: junction tables before owners (FK constraints)
  await tx.delete(articles)
  await tx.delete(userProductReviews)
  await tx.delete(userProducts)
  await tx.delete(tagProducts)
  await tx.delete(productIngredients)
  await tx.delete(tagIngredients)
  await tx.delete(products)
  await tx.delete(ingredients)
  await tx.delete(productTagsDefs)
  await tx.delete(ingredientTagsDefs)
  console.log('✅ Base nettoyée\n')
}

export async function fetchIdMaps(database: DB) {
  console.log('\n📊 Récupération des IDs...')
  const [allProducts, allProductTags, allIngredientTags, allIngredients] = await Promise.all([
    database.select({ id: products.id, slug: products.slug }).from(products),
    database.select({ id: productTagsDefs.id, slug: productTagsDefs.slug }).from(productTagsDefs),
    database
      .select({ id: ingredientTagsDefs.id, slug: ingredientTagsDefs.slug })
      .from(ingredientTagsDefs),
    database.select({ id: ingredients.id, slug: ingredients.slug }).from(ingredients),
  ])

  console.log(
    `   Produits : ${allProducts.length} | ProductTags : ${allProductTags.length} | IngredientTags : ${allIngredientTags.length} | Ingrédients : ${allIngredients.length}`
  )

  return {
    productSlugToId: new Map(allProducts.map((p) => [p.slug, p.id])),
    productTagSlugToId: new Map(allProductTags.map((t) => [t.slug, t.id])),
    ingredientTagSlugToId: new Map(allIngredientTags.map((t) => [t.slug, t.id])),
    ingredientSlugToId: new Map(allIngredients.map((i) => [i.slug, i.id])),
  }
}
