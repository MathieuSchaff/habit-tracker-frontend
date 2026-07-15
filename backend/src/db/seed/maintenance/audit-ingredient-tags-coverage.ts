import { ingredientTagMap } from '../data/ingredient-tags'
import { INGREDIENT_SLUGS } from '../data/ingredients/ingredient-slugs'

function ChecIngredientsSlugs() {
  const allSlugs = new Set(Object.values(INGREDIENT_SLUGS))

  const withTags: [string, number][] = []
  const withoutTags: string[] = []

  for (const slug of allSlugs) {
    const association = ingredientTagMap[slug]

    // check the entry exists AND has at least one useful tag
    if (association) {
      const totalTags = association.primary.length + association.secondary.length

      if (totalTags > 0) {
        withTags.push([slug, totalTags])
      } else {
        withoutTags.push(slug)
      }
    } else {
      // slug not even present in the map
      withoutTags.push(slug)
    }
  }

  console.log("--- RAPPORT D'AUDIT ---")

  if (withoutTags.length > 0) {
    console.error(`❌ ${withoutTags.length} ingrédients n'ont AUCUN tag (ou sont manquants) :`)
    console.table(withoutTags.map((slug) => ({ 'Ingrédient Orphelin': slug })))
  } else {
    console.log('✅ Tous les ingrédients ont au moins un tag !')
  }

  console.log('\n📊 Répartition des tags (Primary + Secondary) :')
  // sort by tag count for readability
  const sortedStats = [...withTags].sort((a, b) => b[1] - a[1])
  console.table(Object.fromEntries(sortedStats))
}
ChecIngredientsSlugs()
