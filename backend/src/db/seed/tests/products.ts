import { allProductData, allProductTagsMap } from '../data/products'

type ProductTagGroups = {
  primary: string[]
  secondary: string[]
  avoid: string[]
}

function checkProductTags() {
  // 1. Source of truth : slugs valides depuis les données produits
  const validProductSlugs = new Set(
    allProductData.filter((p) => typeof p.slug === 'string').map((p) => p.slug as string)
  )

  // 2. Slugs présents dans le map de tags
  const taggedSlugs = new Set(Object.keys(allProductTagsMap))

  // 3. Slugs dans le map mais absents des produits (orphelins)
  const orphanSlugs = Array.from(taggedSlugs).filter((slug) => !validProductSlugs.has(slug))

  // 4. Produits sans aucune entrée dans le map
  const untaggedProducts = Array.from(validProductSlugs).filter((slug) => !taggedSlugs.has(slug))

  // 5. Produits avec des groupes de tags vides
  const emptyTagGroups: Record<string, string[]> = {}
  for (const [slug, tags] of Object.entries(allProductTagsMap) as [string, ProductTagGroups][]) {
    const empty: string[] = []
    if (tags.primary.length === 0) empty.push('primary')
    if (tags.secondary.length === 0) empty.push('secondary')
    if (tags.avoid.length === 0) empty.push('avoid')
    if (empty.length > 0) emptyTagGroups[slug] = empty
  }

  // 6. Distribution : nombre de tags par produit et par groupe
  const distribution = Object.entries(allProductTagsMap).map(([slug, tags]) => {
    const t = tags as ProductTagGroups
    return {
      slug,
      primary: t.primary.length,
      secondary: t.secondary.length,
      avoid: t.avoid.length,
      total: t.primary.length + t.secondary.length + t.avoid.length,
    }
  })

  // --- 📋 RAPPORT ---
  console.group('📋 PRODUCT TAGS AUDIT REPORT')

  if (orphanSlugs.length > 0) {
    console.warn(`⚠️  ${orphanSlugs.length} slug(s) dans le map introuvables dans les produits :`)
    console.table(orphanSlugs)
  } else {
    console.log('✅ Aucun slug orphelin')
  }

  if (untaggedProducts.length > 0) {
    console.error(`❌ ${untaggedProducts.length} produit(s) sans entrée dans le map de tags :`)
    console.table(untaggedProducts)
  } else {
    console.log('✅ Tous les produits ont une entrée dans le map')
  }

  const withEmptyGroups = Object.entries(emptyTagGroups)
  if (withEmptyGroups.length > 0) {
    console.warn(`⚠️  ${withEmptyGroups.length} produit(s) avec des groupes vides :`)
    console.table(
      withEmptyGroups.map(([slug, groups]) => ({ slug, groupes_vides: groups.join(', ') }))
    )
  } else {
    console.log('✅ Tous les groupes (primary/secondary/avoid) sont renseignés')
  }

  console.log('📊 Distribution des tags par produit :')
  console.table(distribution)

  console.groupEnd()
}

checkProductTags()
