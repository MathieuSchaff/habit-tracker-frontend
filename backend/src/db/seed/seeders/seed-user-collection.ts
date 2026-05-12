import type { DB } from '../..'
import { userProductReviews, userProducts } from '../../schema/products/user-products'

export async function seedUserCollection(
  tx: DB,
  userId: string,
  productSlugToId: Map<string, string>
) {
  console.log("\n📦 Ajout de produits à la collection de l'utilisateur seed...")

  const productsToSeed = [
    {
      slug: 'cerave-baume-hydratant',
      status: 'in_stock' as const,
      sentiment: 5,
      comment: 'Mon baume préféré !',
    },
    { slug: 'cerave-lait-hydratant', status: 'in_stock' as const, sentiment: 4 },
    { slug: 'cerave-creme-sa-anti-rugosites', status: 'wishlist' as const },
  ]

  const userProductInserts = productsToSeed
    .map(({ slug, status, sentiment, comment }) => {
      const productId = productSlugToId.get(slug)
      if (!productId) {
        console.warn(`⚠️ Produit avec le slug "${slug}" non trouvé pour la collection.`)
        return null
      }
      return {
        userId,
        productId,
        status,
        sentiment,
        comment,
      }
    })
    .filter((p): p is NonNullable<typeof p> => p !== null)

  if (userProductInserts.length > 0) {
    const inserted = await tx
      .insert(userProducts)
      .values(userProductInserts)
      .onConflictDoNothing()
      .returning({ id: userProducts.id, productId: userProducts.productId })

    console.log(`✅ ${inserted.length} produits ajoutés à la collection.`)

    const baumeId = productSlugToId.get('cerave-baume-hydratant')
    const baumeUserProduct = inserted.find((p) => p.productId === baumeId)

    if (baumeUserProduct) {
      await tx
        .insert(userProductReviews)
        .values({
          userProductId: baumeUserProduct.id,
          tolerance: 5,
          efficacy: 5,
          sensoriality: 4,
          stability: 5,
          mixability: 5,
          valueForMoney: 5,
          comment: 'Excellent rapport qualité/prix. Répare vraiment la barrière cutanée.',
        })
        .onConflictDoNothing()
      console.log('✅ Avis ajouté pour le Baume Hydratant CeraVe.')
    }
  } else {
    console.log('ℹ️ Aucun produit valide trouvé pour la collection.')
  }
}
