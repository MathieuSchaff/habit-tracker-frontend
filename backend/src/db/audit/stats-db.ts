import { count, countDistinct, sql } from 'drizzle-orm'

import { db } from '..'
import {
  articles,
  ingredients,
  ingredientTagLinks,
  ingredientTagTypes,
  productIngredients,
  products,
  productTagLinks,
  productTagTypes,
  userProducts,
  usersSafe,
} from '../schema'

// helpers

function section(title: string) {
  console.log(`\n── ${title} ${'─'.repeat(Math.max(0, 48 - title.length))}`)
}

function row(label: string, value: number | string, indent = 0) {
  const pad = ' '.repeat(indent)
  const dotted = label.padEnd(36 - indent, '.')
  console.log(`${pad}${dotted} ${value}`)
}

// queries

async function productStats() {
  section('Products')

  const [{ total }] = await db.select({ total: count() }).from(products)
  row('total', total)

  const byCategory = await db
    .select({ category: products.category, n: count() })
    .from(products)
    .groupBy(products.category)
    .orderBy(sql`count(*) desc`)
  for (const r of byCategory) row(r.category, r.n, 2)

  const byKind = await db
    .select({ kind: products.kind, n: count() })
    .from(products)
    .groupBy(products.kind)
    .orderBy(sql`count(*) desc`)
  row('by kind', '')
  for (const r of byKind) row(r.kind, r.n, 4)

  const brands = await db
    .select({ brand: products.brand, n: count() })
    .from(products)
    .groupBy(products.brand)
    .orderBy(sql`count(*) desc`)
  row(`brands (${brands.length} distinct)`, '')
  for (const r of brands.slice(0, 20)) row(r.brand, r.n, 4)
  if (brands.length > 20) console.log(`    … and ${brands.length - 20} more`)

  const [{ withIngredients }] = await db
    .select({ withIngredients: countDistinct(productIngredients.productId) })
    .from(productIngredients)
  row('with ingredients', `${withIngredients} / ${total}`)

  const [{ withTags }] = await db
    .select({ withTags: countDistinct(productTagLinks.productId) })
    .from(productTagLinks)
  row('with tags', `${withTags} / ${total}`)

  const [{ avgInci }] = await db
    .select({ avgInci: sql<string>`round(avg(length(inci)))` })
    .from(products)
    .where(sql`inci is not null`)
  row('avg INCI length (chars)', avgInci ?? 'n/a')
}

async function ingredientStats() {
  section('Ingredients')

  const [{ total }] = await db.select({ total: count() }).from(ingredients)
  row('total', total)

  const byType = await db
    .select({ type: ingredients.type, n: count() })
    .from(ingredients)
    .groupBy(ingredients.type)
    .orderBy(sql`count(*) desc`)
  for (const r of byType) row(r.type, r.n, 2)

  const [{ withTags }] = await db
    .select({ withTags: countDistinct(ingredientTagLinks.ingredientId) })
    .from(ingredientTagLinks)
  row('with tags', `${withTags} / ${total}`)

  const [{ avgPerProduct }] = await db.select({ avgPerProduct: sql<string>`round(avg(cnt))` }).from(
    db
      .select({ cnt: count().as('cnt') })
      .from(productIngredients)
      .groupBy(productIngredients.productId)
      .as('sub')
  )
  row('avg per product', avgPerProduct ?? 'n/a')
}

async function tagStats() {
  section('Tags (definitions)')

  const [{ totalProd }] = await db.select({ totalProd: count() }).from(productTagTypes)
  row('product tag defs', totalProd)

  const byProdType = await db
    .select({ tagType: productTagTypes.tagType, n: count() })
    .from(productTagTypes)
    .groupBy(productTagTypes.tagType)
    .orderBy(sql`count(*) desc`)
  for (const r of byProdType) row(r.tagType, r.n, 2)

  const [{ totalIng }] = await db.select({ totalIng: count() }).from(ingredientTagTypes)
  row('ingredient tag defs', totalIng)

  const byIngType = await db
    .select({ tagType: ingredientTagTypes.tagType, n: count() })
    .from(ingredientTagTypes)
    .groupBy(ingredientTagTypes.tagType)
    .orderBy(sql`count(*) desc`)
  for (const r of byIngType) row(r.tagType, r.n, 2)

  const [{ tagProductLinks }] = await db.select({ tagProductLinks: count() }).from(productTagLinks)
  const [{ tagIngLinks }] = await db.select({ tagIngLinks: count() }).from(ingredientTagLinks)
  row('product tag assignments', tagProductLinks)
  row('ingredient tag assignments', tagIngLinks)
}

async function userStats() {
  section('Users')

  const [{ total }] = await db.select({ total: count() }).from(usersSafe)
  const [{ active }] = await db
    .select({ active: count() })
    .from(usersSafe)
    .where(sql`deleted_at is null and is_demo = false`)
  const [{ demo }] = await db.select({ demo: count() }).from(usersSafe).where(sql`is_demo = true`)
  row('total', total)
  row('active (non-demo, non-deleted)', active)
  row('demo', demo)

  const [{ withProducts }] = await db
    .select({ withProducts: countDistinct(userProducts.userId) })
    .from(userProducts)
  row('with at least 1 product', withProducts)
}

async function contentStats() {
  section('Content')

  const [{ totalArticles }] = await db.select({ totalArticles: count() }).from(articles)
  const [{ published }] = await db
    .select({ published: count() })
    .from(articles)
    .where(sql`published_at is not null`)
  row('articles total', totalArticles)
  row('articles published', published)
  row('articles draft', totalArticles - published)
}

// main

async function main() {
  console.log(`DB Stats — ${new Date().toISOString()}`)

  await productStats()
  await ingredientStats()
  await tagStats()
  await userStats()
  await contentStats()

  console.log('')
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
