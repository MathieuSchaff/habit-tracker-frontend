// Strict rules for tagging an ingredient
//
// Since the taxonomy refactor (April 2026), every slug carries a `scope` in
// TAG_TAXONOMY (`ingredient` | `product` | `both`). The `shared-schemas-vs-tags`
// test auto-checks that every slug used here has a scope compatible with a
// molecule — no more hand-maintained blacklist, TAG_TAXONOMY is the source of
// truth.
//
// Categories forbidden on an ingredient (scope = 'product'):
//   [x] product_type   (e.g. serum, creme-hydratante)
//   [x] routine_step   (e.g. matin, hydratation, emollience)
//   [x] skin_zone      (e.g. zone-visage, zone-yeux)
//   [x] most product_label (sans-parfum, vegan, hypoallergenique…)
//   [x] "finished product" skin_effect (texture-riche, texture-legere)
//
// Scope = 'both': allowed here because they ALSO describe an intrinsic
// molecular property:
//   [v] ingredient_attribute  (actif, humectant, filtre-uv, tensioactif…)
//   [v] skin_effect (OCCLUSIF, REPULPANT, MATIFIANT, EFFET_PROTECTEUR)
//   [v] product_label (FILTRES_CHIMIQUES, FILTRES_MINERAUX)
//   [v] shared_label  (COMEDOGENE, NON_COMEDOGENE)
//   [v] concern, skin_type
//
// `avoid` rule:
//   [v] skin_type or concern only.
//   [x] never an attribute, label, product_type or routine_step.
//   [!] conventional exception: `grossesse-compatible` (scope=product) is
//       tolerated in `avoid` to mean "contraindicated during pregnancy" —
//       the test knows about it.
//
// Comedogenicity convention:
//   - `comedogene` / `non-comedogene` are molecular FACTS → they go in
//     `secondary`, never in `avoid`.
//   - The matching clinical contraindication is expressed as
//     `avoid: [peau-grasse, anti-acne]` on the ingredient concerned.

import { dentalTagMap } from '../ingredients/dental/ingredient-tags'
import { haircareTagMap } from '../ingredients/haircare/ingredient-tags'
import { skincareTagMap } from '../ingredients/skincare/ingredient-tags'
import { supplementTagMap } from '../ingredients/supplements/ingredient-tags'

export interface IngredientAssociation {
  /** Primary tags: the active's major proven benefits */
  primary: string[]
  /** Secondary tags: supporting benefits or specific targets */
  secondary: string[]
  /** Exclusion tags: skin types or conditions where the active is not advised */
  avoid: string[]
}

export type IngredientTagMap = Record<string, IngredientAssociation>

export const ingredientTagMap: IngredientTagMap = {
  ...dentalTagMap,
  ...haircareTagMap,
  ...skincareTagMap,
  ...supplementTagMap,
}
