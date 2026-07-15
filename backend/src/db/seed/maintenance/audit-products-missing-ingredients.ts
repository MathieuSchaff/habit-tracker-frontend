import { allIngredientProductTags, allProductData } from '../data/products'

type ProductWithSlug = (typeof allProductData)[number] & { slug: string }

function hasSlug(product: (typeof allProductData)[number]): product is ProductWithSlug {
  return typeof product.slug === 'string'
}

function CheckProductIngredients() {
  const validProducts = allProductData.filter(hasSlug)

  const entries: [string, number][] = validProducts.map((p) => [p.slug, 0])
  const slugsCounter = new Map<string, number>(entries)
  const unknownSlugs: string[] = []

  for (const association of allIngredientProductTags) {
    const slug = association.productSlug
    const current = slugsCounter.get(slug)

    if (current !== undefined) {
      slugsCounter.set(slug, current + 1)
    } else {
      // Ingredient points at a product slug that doesn't exist in allProductData
      if (!unknownSlugs.includes(slug)) {
        unknownSlugs.push(slug)
      }
    }
  }

  const withoutIngredients: string[] = []
  const withIngredients: [string, number][] = []

  for (const [slug, count] of slugsCounter) {
    if (count === 0) {
      withoutIngredients.push(slug)
    } else {
      withIngredients.push([slug, count])
    }
  }

  console.log("--- 🧪 RAPPORT D'AUDIT INGRÉDIENTS ---")

  // Error: ingredients linked to slugs that don't exist (often a typo)
  if (unknownSlugs.length > 0) {
    console.error(
      `⚠️ ERREUR : ${unknownSlugs.length} slugs dans les ingrédients n'existent pas dans la base produit :`
    )
    console.table(unknownSlugs.map((s) => ({ 'Slug Inconnu': s })))
  }

  // Error: "empty" products
  if (withoutIngredients.length > 0) {
    console.warn(`❌ ${withoutIngredients.length} produits sans AUCUN ingrédient répertorié :`)
    console.table(withoutIngredients.map((s) => ({ 'Produit Vide': s })))
  }

  console.log('\n📊 Répartition des ingrédients par produit :')
  console.table(Object.fromEntries(withIngredients))
}

CheckProductIngredients()
