import { allIngredientProductTags, allProductData } from '../data/products'

type ProductWithSlug = (typeof allProductData)[number] & { slug: string }

function hasSlug(product: (typeof allProductData)[number]): product is ProductWithSlug {
  return typeof product.slug === 'string'
}

function CheckProductIngredients() {
  const validProducts = allProductData.filter(hasSlug)

  // Initialisation du compteur : [slug, nombre_d_ingredients]
  const entries: [string, number][] = validProducts.map((p) => [p.slug, 0])
  const slugsCounter = new Map<string, number>(entries)
  const unknownSlugs: string[] = []

  // 1. Parcours des associations ingrédients -> produits
  for (const association of allIngredientProductTags) {
    const slug = association.productSlug
    const current = slugsCounter.get(slug)

    if (current !== undefined) {
      slugsCounter.set(slug, current + 1)
    } else {
      // Cas où l'ingrédient pointe vers un produit qui n'existe pas dans allProductData
      if (!unknownSlugs.includes(slug)) {
        unknownSlugs.push(slug)
      }
    }
  }

  const withoutIngredients: string[] = []
  const withIngredients: [string, number][] = []

  // 2. Tri des résultats
  for (const [slug, count] of slugsCounter) {
    if (count === 0) {
      withoutIngredients.push(slug)
    } else {
      withIngredients.push([slug, count])
    }
  }

  // --- 📝 RAPPORT D'AUDIT ---
  console.log("--- 🧪 RAPPORT D'AUDIT INGRÉDIENTS ---")

  // Erreur : Ingrédients liés à des slugs inexistants (Souvent une faute de frappe)
  if (unknownSlugs.length > 0) {
    console.error(
      `⚠️ ERREUR : ${unknownSlugs.length} slugs dans les ingrédients n'existent pas dans la base produit :`
    )
    console.table(unknownSlugs.map((s) => ({ 'Slug Inconnu': s })))
  }

  // Erreur : Produits "vides"
  if (withoutIngredients.length > 0) {
    console.warn(`❌ ${withoutIngredients.length} produits sans AUCUN ingrédient répertorié :`)
    console.table(withoutIngredients.map((s) => ({ 'Produit Vide': s })))
  }

  // Succès : Répartition
  console.log('\n📊 Répartition des ingrédients par produit :')
  console.table(Object.fromEntries(withIngredients))
}

CheckProductIngredients()
