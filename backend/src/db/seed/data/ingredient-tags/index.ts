// Règles strictes pour tagger un ingrédient
//
// Depuis le refactor de la taxonomie (avril 2026), chaque slug porte un
// `scope` dans TAG_TAXONOMY (`ingredient` | `product` | `both`). Le test
// `shared-schemas-vs-tags` vérifie automatiquement que tout slug utilisé
// ici a un scope compatible avec une molécule — plus besoin de tenir une
// liste noire à la main, TAG_TAXONOMY est la source de vérité.
//
// Catégories interdites sur un ingrédient (scope = 'product') :
//   [x] product_type   (ex: serum, creme-hydratante)
//   [x] routine_step   (ex: matin, hydratation, emollience)
//   [x] skin_zone      (ex: zone-visage, zone-yeux)
//   [x] la plupart des product_label (sans-parfum, vegan, hypoallergenique…)
//   [x] skin_effect "produit fini" (texture-riche, texture-legere)
//
// Scope = 'both' : autorisés ici parce qu'ils décrivent AUSSI une
// propriété intrinsèque de molécule :
//   [v] ingredient_attribute  (actif, humectant, filtre-uv, tensioactif…)
//   [v] skin_effect (OCCLUSIF, REPULPANT, MATIFIANT, EFFET_PROTECTEUR)
//   [v] product_label (FILTRES_CHIMIQUES, FILTRES_MINERAUX)
//   [v] shared_label  (COMEDOGENE, NON_COMEDOGENE)
//   [v] concern, skin_type
//
// Règle `avoid` :
//   [v] uniquement skin_type ou concern.
//   [x] jamais d'attribut, de label, de product_type ni de routine_step.
//   [!] exception conventionnelle : `grossesse-compatible` (scope=product)
//       est toléré dans `avoid` pour signifier "contre-indiqué pendant
//       la grossesse" — le test le sait.
//
// Convention comédogénicité :
//   - `comedogene` / `non-comedogene` sont des FAITS moléculaires →
//     ils vont en `secondary`, jamais en `avoid`.
//   - La contre-indication clinique correspondante se traduit par
//     `avoid: [peau-grasse, anti-acne]` sur l'ingrédient concerné.

import { dentalTagMap } from '../ingredients/dental/ingredient-tags'
import { haircareTagMap } from '../ingredients/haircare/ingredient-tags'
import { skincareTagMap } from '../ingredients/skincare/ingredient-tags'
import { supplementTagMap } from '../ingredients/supplements/ingredient-tags'

export interface IngredientAssociation {
  /** Tags principaux : bénéfices majeurs prouvés de l'actif */
  primary: string[]
  /** Tags secondaires : bénéfices d'accompagnement ou cibles spécifiques */
  secondary: string[]
  /** Tags d'exclusion : types de peau ou conditions où l'actif est déconseillé */
  avoid: string[]
}

export type IngredientTagMap = Record<string, IngredientAssociation>

export const ingredientTagMap: IngredientTagMap = {
  ...dentalTagMap,
  ...haircareTagMap,
  ...skincareTagMap,
  ...supplementTagMap,
}
