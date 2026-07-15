import { ingredientData as newData } from '../data/ingredients'
import { INGREDIENT_SLUGS } from '../data/ingredients/ingredient-slugs'

// Ingredient-system sync audit: zero orphans, zero dupes, zero empty content.
function auditIngredientsSystem() {
  console.log("🛡️  LANCEMENT DE L'AUDIT DU SYSTÈME INGRÉDIENTS...\n")

  const dataSlugs = newData.map((i) => i.slug)
  const configSlugs = Object.values(INGREDIENT_SLUGS)

  const dataSet = new Set(dataSlugs)
  const configSet = new Set(configSlugs)

  // Defined in config but absent from data
  const missingInData = configSlugs.filter((slug) => !dataSet.has(slug))

  // Present in data but absent from config
  const ghostSlugs = dataSlugs.filter((slug) => !configSet.has(slug))

  // Slugs used more than once in the data file
  const duplicates = dataSlugs.filter((slug, index) => dataSlugs.indexOf(slug) !== index)

  const incompleteEntries = newData
    .filter((i) => !i.name || !i.description || i.content.length < 50)
    .map((i) => i.slug)

  console.log('📊 RÉSUMÉ DES DONNÉES')
  console.table({
    'Slugs configurés (Config)': configSlugs.length,
    'Fiches rédigées (Data)': newData.length,
    'Entrées complètes': newData.length - incompleteEntries.length,
  })

  console.log('\n⚖️  VÉRIFICATION DE LA COHÉRENCE')

  // Editorial fiches live in the DB, not TS (only a handful are kept as shape
  // examples). Config slugs without a TS fiche is the expected default post
  // DB-as-truth, not a defect — report as info, never gate the audit on it.
  console.log(
    `ℹ️  ${missingInData.length}/${configSlugs.length} config slugs sans fiche TS (DB-only by design)`
  )

  if (duplicates.length > 0) {
    console.warn(`⚠️  DOUBLONS : ${duplicates.length} slugs apparaissent plusieurs fois :`)
    console.log([...new Set(duplicates)])
  } else {
    console.log('✅ UNIQUE : Aucun doublon dans la base de données.')
  }

  if (ghostSlugs.length > 0) {
    console.warn(
      `👻 FANTÔMES : ${ghostSlugs.length} fiches utilisent des slugs non définis en config :`
    )
    console.log(ghostSlugs)
  }

  if (incompleteEntries.length > 0) {
    console.error(`📝 QUALITÉ : ${incompleteEntries.length} fiches sont vides ou trop courtes :`)
    console.log(incompleteEntries)
  }

  const isPerfect =
    duplicates.length === 0 && ghostSlugs.length === 0 && incompleteEntries.length === 0

  if (isPerfect) {
    console.log('\n✨  AUDIT PARFAIT : La base ingrédients est saine et synchronisée !')
  } else {
    console.log('\n🛠️  DES CORRECTIONS SONT NÉCESSAIRES (voir alertes ci-dessus).')
  }
}

auditIngredientsSystem()
