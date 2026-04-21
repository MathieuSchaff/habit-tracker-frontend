import { ingredientData as newData } from '../data/ingredients'
import { INGREDIENT_SLUGS } from '../data/ingredients/ingredient-slugs'

/**
 * Audit de synchronisation du système d'ingrédients
 * Objectif : Zéro orphelin, Zéro doublon, Zéro contenu vide.
 */
function auditIngredientsSystem() {
  console.log("🛡️  LANCEMENT DE L'AUDIT DU SYSTÈME INGRÉDIENTS...\n")

  // 1. Récupération des listes
  const dataSlugs = newData.map((i) => i.slug)
  const configSlugs = Object.values(INGREDIENT_SLUGS)

  const dataSet = new Set(dataSlugs)
  const configSet = new Set(configSlugs)

  // --- ANALYSE DES ÉCARTS ---

  // A. Slugs manquants (Définis en config mais absents de la DATA)
  const missingInData = configSlugs.filter((slug) => !dataSet.has(slug))

  // B. Slugs fantômes (Présents en DATA mais absents de la CONFIG)
  const ghostSlugs = dataSlugs.filter((slug) => !configSet.has(slug))

  // C. Doublons (Slugs utilisés plusieurs fois dans le fichier data)
  const duplicates = dataSlugs.filter((slug, index) => dataSlugs.indexOf(slug) !== index)

  // D. Vérification de la complétude du contenu
  const incompleteEntries = newData
    .filter((i) => !i.name || !i.description || i.content.length < 50)
    .map((i) => i.slug)

  // --- AFFICHAGE DU RAPPORT ---

  console.log('📊 RÉSUMÉ DES DONNÉES')
  console.table({
    'Slugs configurés (Config)': configSlugs.length,
    'Fiches rédigées (Data)': newData.length,
    'Entrées complètes': newData.length - incompleteEntries.length,
  })

  console.log('\n⚖️  VÉRIFICATION DE LA COHÉRENCE')

  // Rapport : Manquants (Priorité 1)
  if (missingInData.length > 0) {
    console.error(
      `❌ MANQUANTS : ${missingInData.length} slugs de la config n'ont pas de contenu :`
    )
    console.log(missingInData)
  } else {
    console.log('✅ COMPLET : Tous les slugs de la config ont une fiche associée.')
  }

  // Rapport : Doublons
  if (duplicates.length > 0) {
    console.warn(`⚠️  DOUBLONS : ${duplicates.length} slugs apparaissent plusieurs fois :`)
    console.log([...new Set(duplicates)])
  } else {
    console.log('✅ UNIQUE : Aucun doublon dans la base de données.')
  }

  // Rapport : Fantômes
  if (ghostSlugs.length > 0) {
    console.warn(
      `👻 FANTÔMES : ${ghostSlugs.length} fiches utilisent des slugs non définis en config :`
    )
    console.log(ghostSlugs)
  }

  // Rapport : Qualité
  if (incompleteEntries.length > 0) {
    console.error(`📝 QUALITÉ : ${incompleteEntries.length} fiches sont vides ou trop courtes :`)
    console.log(incompleteEntries)
  }

  // CONCLUSION FINALE
  const isPerfect =
    missingInData.length === 0 &&
    duplicates.length === 0 &&
    ghostSlugs.length === 0 &&
    incompleteEntries.length === 0

  if (isPerfect) {
    console.log('\n✨  AUDIT PARFAIT : La base ingrédients est saine et synchronisée !')
  } else {
    console.log('\n🛠️  DES CORRECTIONS SONT NÉCESSAIRES (voir alertes ci-dessus).')
  }
}

// Lancement
auditIngredientsSystem()
