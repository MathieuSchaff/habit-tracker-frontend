import type { ProductCategory } from '@habit-tracker/shared'
import { PRODUCT_KINDS } from '@habit-tracker/shared'

import type { Ingredient, ProductTagGroups, UnifiedProductSeed } from './types'

const kindToCategory: Record<string, ProductCategory> = Object.fromEntries(
  (Object.entries(PRODUCT_KINDS) as [ProductCategory, Record<string, string>][]).flatMap(
    ([cat, kinds]) => Object.values(kinds).map((k) => [k, cat])
  )
)

// Dental imports
import { ARTHRODONT_SEED } from './dental/arthrodont/arthrodont.seed'
import { BAUSCH___LOMB_SEED } from './dental/bauschLomb/bauschLomb.seed'
import { BIOGAIA_SEED } from './dental/biogaia/biogaia.seed'
import { BOTOT_SEED } from './dental/botot/botot.seed'
import { CB12_SEED } from './dental/cb12/cb12.seed'
import { CRINEX_SEED } from './dental/crinex/crinex.seed'
import { DENTAL_CARE_PRODUCTS_SEED } from './dental/dentalCareProducts/dentalCareProducts.seed'
import { ELGYDIUM_SEED } from './dental/elgydium/elgydium.seed'
import { ELMEX_SEED } from './dental/elmex/elmex.seed'
import { FLUOCARIL_SEED } from './dental/fluocaril/fluocaril.seed'
import { GUM_SEED } from './dental/gum/gum.seed'
import { HYALUGEL_SEED } from './dental/hyalugel/hyalugel.seed'
import { INAVA_SEED } from './dental/inava/inava.seed'
import { LA_ROS_E_SEED as LA_ROSEE_DENTAL_SEED } from './dental/laRosee/laRosee.seed'
import { MEDIDENT_SEED } from './dental/medident/medident.seed'
import { M_RIDOL_SEED } from './dental/meridol/meridol.seed'
import { ORAL_B_SEED } from './dental/oralB/oralB.seed'
import { PARODONTAX_SEED } from './dental/parodontax/parodontax.seed'
import { PAROGENCYL_SEED } from './dental/parogencyl/parogencyl.seed'
import { POLIDENT_SEED } from './dental/polident/polident.seed'
import { RICQLES_SEED } from './dental/ricqles/ricqles.seed'
import { SANOGYL_SEED } from './dental/sanogyl/sanogyl.seed'
import { SANT__SILICE_SEED } from './dental/santeSilice/santeSilice.seed'
import { SENSODYNE_SEED } from './dental/sensodyne/sensodyne.seed'
import { TEPE_SEED } from './dental/tepe/tepe.seed'
import { WATERPIK_SEED } from './dental/waterpik/waterpik.seed'
// Haircare imports
import { ARGILETZ_SEED } from './haircare/argiletz/argiletz.seed'
import { ARKOPHARMA_SEED } from './haircare/arkopharma/arkopharma.seed'
import { BAILLEUL_SEED } from './haircare/bailleul/bailleul.seed'
import { BEAUTERRA_SEED } from './haircare/beauterra/beauterra.seed'
import { BIOCYTE_SEED } from './haircare/biocyte/biocyte.seed'
import { BIOKAP_SEED } from './haircare/biokap/biokap.seed'
import { BIORENE_SEED } from './haircare/biorene/biorene.seed'
import { CATTIER_SEED } from './haircare/cattier/cattier.seed'
import { CAUDALIE_SEED } from './haircare/caudalie/caudalie.seed'
import { CINQ_SUR_CINQ_SEED } from './haircare/cinqSurCinq/cinqSurCinq.seed'
import { CLARIFICATION_SEED } from './haircare/clarification/clarification.seed'
import { COSLYS_SEED } from './haircare/coslys/coslys.seed'
import { CUT_BY_FRED_SEED } from './haircare/cutByFred/cutByFred.seed'
import { DERMACLAY_SEED } from './haircare/dermaclay/dermaclay.seed'
import { DR_THEISS_SEED } from './haircare/drTheiss/drTheiss.seed'
import { DUCRAY_HAIRCARE_SEED } from './haircare/ducray/ducray.seed'
import { ESSENCE_SEED } from './haircare/essence/essence.seed'
import { EYE_CARE_SEED } from './haircare/eyeCare/eyeCare.seed'
import { FLORAME_BODYCARE_SEED } from './haircare/florame/florame-bodycare.seed'
import { HERBATINT_SEED } from './haircare/herbatint/herbatint.seed'
import { ITEM_SEED } from './haircare/item/item.seed'
import { JALDES_SEED } from './haircare/jaldes/jaldes.seed'
import { K_RANOVE_SEED } from './haircare/keranove/keranove.seed'
import { KLORANE_SEED } from './haircare/klorane/klorane.seed'
import { LA_ROS_E_SEED as LA_ROSEE_HAIRCARE_SEED } from './haircare/laRosee/laRosee.seed'
import { LAZARTIGUE_SEED } from './haircare/lazartigue/lazartigue.seed'
import { LED_NOREVA_SEED } from './haircare/ledNoreva/ledNoreva.seed'
import { LES_3_CH_NES_SEED } from './haircare/les3Chenes/les3Chenes.seed'
import { LES_SECRETS_DE_LOLY_SEED } from './haircare/lesSecretsDeLoly/lesSecretsDeLoly.seed'
import { LES_SECRETS_DE_LOLY_BODYCARE_SEED } from './haircare/lesSecretsDeLoly/lesSecretsDeLoly-bodycare.seed'
import { LES_SECRETS_DE_LOLY_SKINCARE_SEED } from './haircare/lesSecretsDeLoly/lesSecretsDeLoly-skincare.seed'
import { LES_SECRETS_DE_LOLY_SOLAIRE_SEED } from './haircare/lesSecretsDeLoly/lesSecretsDeLoly-solaire.seed'
import { L_OR_AL_PROFESSIONNEL_SEED } from './haircare/lOrealProfessionnel/lOrealProfessionnel.seed'
import { LUX_OL_SEED } from './haircare/luxeol/luxeol.seed'
import { MELVITA_SEED } from './haircare/melvita/melvita.seed'
import { MKL_GREEN_NATURE_SEED } from './haircare/mklGreenNature/mklGreenNature.seed'
import { NATESSANCE_SEED } from './haircare/natessance/natessance.seed'
import { NEUTRADERM_SEED } from './haircare/neutraderm/neutraderm.seed'
import { NEUTROGENA_SEED } from './haircare/neutrogena/neutrogena.seed'
import { NUXE_SEED } from './haircare/nuxe/nuxe.seed'
import { OLAPLEX_SEED } from './haircare/olaplex/olaplex.seed'
import { PETROLE_HAHN_SEED } from './haircare/petroleHahn/petroleHahn.seed'
import { PHYTO_SEED } from './haircare/phyto/phyto.seed'
import { POUXIT_SEED } from './haircare/pouxit/pouxit.seed'
import { PRANAROM_SEED } from './haircare/pranarom/pranarom.seed'
import { PURESSENTIEL_SEED } from './haircare/puressentiel/puressentiel.seed'
import { REDKEN_SEED } from './haircare/redken/redken.seed'
import { RENE_FURTERER_SEED } from './haircare/reneFurterer/reneFurterer.seed'
import { SANOFLORE_SEED } from './haircare/sanoflore/sanoflore.seed'
import { SEBAMED_SEED } from './haircare/sebamed/sebamed.seed'
import { SOW__SEED } from './haircare/sowe/sowe.seed'
import { STIEFEL_SEED } from './haircare/stiefel/stiefel.seed'
import { TOPPIK_SEED } from './haircare/toppik/toppik.seed'
import { WELLA_PROFESSIONALS_SEED } from './haircare/wellaProfessionals/wellaProfessionals.seed'
// Supplement imports
import { NUTRIPURE_SEED } from './supplement/nutripure/nutripure.seed'

// Aggregation

const allUnified: UnifiedProductSeed[] = [
  // haircare
  ...ARGILETZ_SEED,
  ...ARKOPHARMA_SEED,
  ...BAILLEUL_SEED,
  ...BEAUTERRA_SEED,
  ...BIOCYTE_SEED,
  ...BIOKAP_SEED,
  ...BIORENE_SEED,
  ...CATTIER_SEED,
  ...CAUDALIE_SEED,
  ...CINQ_SUR_CINQ_SEED,
  ...CLARIFICATION_SEED,
  ...COSLYS_SEED,
  ...CUT_BY_FRED_SEED,
  ...DERMACLAY_SEED,
  ...DR_THEISS_SEED,
  ...DUCRAY_HAIRCARE_SEED,
  ...ESSENCE_SEED,
  ...EYE_CARE_SEED,
  ...HERBATINT_SEED,
  ...ITEM_SEED,
  ...JALDES_SEED,
  ...K_RANOVE_SEED,
  ...KLORANE_SEED,
  ...LA_ROSEE_HAIRCARE_SEED,
  ...LAZARTIGUE_SEED,
  ...LED_NOREVA_SEED,
  ...LES_3_CH_NES_SEED,
  ...LES_SECRETS_DE_LOLY_SEED,
  ...L_OR_AL_PROFESSIONNEL_SEED,
  ...LUX_OL_SEED,
  ...MELVITA_SEED,
  ...MKL_GREEN_NATURE_SEED,
  ...NATESSANCE_SEED,
  ...NEUTRADERM_SEED,
  ...NEUTROGENA_SEED,
  ...NUXE_SEED,
  ...OLAPLEX_SEED,
  ...PETROLE_HAHN_SEED,
  ...PHYTO_SEED,
  ...POUXIT_SEED,
  ...PRANAROM_SEED,
  ...PURESSENTIEL_SEED,
  ...REDKEN_SEED,
  ...RENE_FURTERER_SEED,
  ...SANOFLORE_SEED,
  ...SOW__SEED,
  ...STIEFEL_SEED,
  ...TOPPIK_SEED,
  ...WELLA_PROFESSIONALS_SEED,
  // dental
  ...ARTHRODONT_SEED,
  ...BAUSCH___LOMB_SEED,
  ...BIOGAIA_SEED,
  ...BOTOT_SEED,
  ...CB12_SEED,
  ...CRINEX_SEED,
  ...DENTAL_CARE_PRODUCTS_SEED,
  ...ELGYDIUM_SEED,
  ...ELMEX_SEED,
  ...FLUOCARIL_SEED,
  ...GUM_SEED,
  ...HYALUGEL_SEED,
  ...INAVA_SEED,
  ...LA_ROSEE_DENTAL_SEED,
  ...MEDIDENT_SEED,
  ...M_RIDOL_SEED,
  ...ORAL_B_SEED,
  ...PARODONTAX_SEED,
  ...PAROGENCYL_SEED,
  ...POLIDENT_SEED,
  ...RICQLES_SEED,
  ...SANT__SILICE_SEED,
  ...SENSODYNE_SEED,
  ...TEPE_SEED,
  ...WATERPIK_SEED,

  // imported candidates
  ...FLORAME_BODYCARE_SEED,
  ...LES_SECRETS_DE_LOLY_BODYCARE_SEED,
  ...SANOGYL_SEED,
  ...SEBAMED_SEED,
  ...LES_SECRETS_DE_LOLY_SKINCARE_SEED,
  ...LES_SECRETS_DE_LOLY_SOLAIRE_SEED,
  ...NUTRIPURE_SEED,
]

// Derived exports (previously split across 4 files)

export const allProductData = allUnified.map(
  ({ tags: _tags, keyIngredients: _ki, ...product }) => ({
    category: kindToCategory[product.kind],
    ...product,
  })
)

export const allProductTagsMap: Record<string, ProductTagGroups> = Object.fromEntries(
  allUnified.map((p) => [p.slug, p.tags])
)

const allProductIngredientsMap: Record<string, Ingredient[]> = Object.fromEntries(
  allUnified.flatMap((p) =>
    p.keyIngredients && p.keyIngredients.length > 0 ? [[p.slug, p.keyIngredients] as const] : []
  )
)

export { allProductIngredientsMap as ALL_PRODUCT_INGREDIENTS_MAP }

export const allIngredientProductTags = Object.entries(allProductIngredientsMap).flatMap(
  ([productSlug, ings]) =>
    ings.map((ing) => ({
      productSlug,
      ingredientSlug: ing.slug,
      concentrationValue: ing.concentrationValue ?? ing.value ?? null,
      concentrationUnit: ing.concentrationUnit ?? ing.unit ?? null,
      notes: ing.notes ?? null,
    }))
)
