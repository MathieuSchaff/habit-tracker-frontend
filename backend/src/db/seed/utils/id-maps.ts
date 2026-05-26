import { db } from '../..'
import type { DB } from '../../index'
import {
  articles,
  discussionReplies,
  discussionThreads,
  ingredients,
  ingredientTagLinks,
  ingredientTagTypes,
  productIngredients,
  products,
  productTagLinks,
  productTagTypes,
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
  // Order matters: junction tables before owners (FK constraints).
  // Discussions: replies cascade from threads, but threads have an
  // ON DELETE RESTRICT FK to products — must be cleared explicitly
  // before the products delete or the seed transaction aborts.
  await tx.delete(articles)
  await tx.delete(discussionReplies)
  await tx.delete(discussionThreads)
  await tx.delete(userProductReviews)
  await tx.delete(userProducts)
  await tx.delete(productTagLinks)
  await tx.delete(productIngredients)
  await tx.delete(ingredientTagLinks)
  await tx.delete(products)
  await tx.delete(ingredients)
  await tx.delete(productTagTypes)
  await tx.delete(ingredientTagTypes)
  console.log('✅ Base nettoyée\n')
}

export async function fetchIdMaps(database: DB) {
  console.log('\n📊 Récupération des IDs...')
  const [allProducts, allProductTags, allIngredientTags, allIngredients] = await Promise.all([
    database.select({ id: products.id, slug: products.slug }).from(products),
    database.select({ id: productTagTypes.id, slug: productTagTypes.slug }).from(productTagTypes),
    database
      .select({ id: ingredientTagTypes.id, slug: ingredientTagTypes.slug })
      .from(ingredientTagTypes),
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
