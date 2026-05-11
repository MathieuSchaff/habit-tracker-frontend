import { HAIRCARE_INGREDIENT_TAG_SLUGS as H } from '@habit-tracker/shared'

import type { IngredientTagMap } from '../../ingredient-tags'
import { SKINCARE_INGREDIENT_TAG_SLUGS } from '../../tags'
import { INGREDIENT_SLUGS } from '../ingredient-slugs'
import {
  HAIR_AGENTS_NACRANTS,
  HAIR_ANTIPELLICULAIRES,
  HAIR_BEURRES_VEGETAUX,
  HAIR_CERAMIDES_LIPIDES,
  HAIR_CHELATEURS,
  HAIR_CONDITIONNEURS,
  HAIR_DIVERS,
  HAIR_EPAISSISSANTS,
  HAIR_HUILES_MINERALES,
  HAIR_HUILES_VEGETALES,
  HAIR_HUMECTANTS,
  HAIR_PROTEINES,
  HAIR_STIMULANTS_CROISSANCE,
  HAIR_TENSIOACTIFS_AMPHOTERES,
  HAIR_TENSIOACTIFS_ANIONIQUES,
  HAIR_TENSIOACTIFS_CATIONIQUES,
  HAIR_TENSIOACTIFS_NON_IONIQUES,
} from './ingredient-slugs'

// Mapping vocabulaire de tags par ingrédient haircare. Structure et conventions :
//
// - `primary`   : rôle biochimique principal (ingredient_attribute ou hair_effect
//                 dominant). Un seul ou deux max.
// - `secondary` : bénéfices d'accompagnement + affinités (hair_type,
//                 concern) + effets secondaires. Peut être plus large.
// - `avoid`     : uniquement `skin_type` / `hair_type` / `concern` — typiquement
//                 cuir chevelu sensible / irrité pour les tensioactifs forts,
//                 cheveux gras pour les occlusifs lourds.
//
// Les entrées "dual-domain" (EDTA, coco-glucoside, sodium-cocoyl-isethionate…)
// tirent leurs slugs du vocabulaire skincare (SKINCARE_INGREDIENT_TAG_SLUGS) car l'ingrédient est
// dédupliqué côté skincare au moment du seed.

export const haircareTagMap: IngredientTagMap = {
  // Dual-domain skincare+haircare — slugs skincare (dedup skincare-first)
  [INGREDIENT_SLUGS.TETRASODIUM_EDTA]: {
    primary: [SKINCARE_INGREDIENT_TAG_SLUGS.EXCIPIENT],
    secondary: [],
    avoid: [],
  },
  [INGREDIENT_SLUGS.HYDROXYETHYLCELLULOSE]: {
    primary: [SKINCARE_INGREDIENT_TAG_SLUGS.EXCIPIENT],
    secondary: [],
    avoid: [],
  },
  [INGREDIENT_SLUGS.HYDROXYPROPYL_METHYLCELLULOSE]: {
    primary: [SKINCARE_INGREDIENT_TAG_SLUGS.EXCIPIENT],
    secondary: [],
    avoid: [],
  },
  [INGREDIENT_SLUGS.SCLEROTIUM_GUM]: {
    primary: [SKINCARE_INGREDIENT_TAG_SLUGS.EXCIPIENT],
    secondary: [],
    avoid: [],
  },
  [INGREDIENT_SLUGS.BEHENYL_ALCOHOL]: {
    primary: [SKINCARE_INGREDIENT_TAG_SLUGS.EMOLLIENT, SKINCARE_INGREDIENT_TAG_SLUGS.EXCIPIENT],
    secondary: [SKINCARE_INGREDIENT_TAG_SLUGS.PEAU_SECHE],
    avoid: [],
  },
  [INGREDIENT_SLUGS.DIMETHICONOL]: {
    primary: [SKINCARE_INGREDIENT_TAG_SLUGS.EMOLLIENT, SKINCARE_INGREDIENT_TAG_SLUGS.OCCLUSIF],
    secondary: [SKINCARE_INGREDIENT_TAG_SLUGS.PEAU_SECHE],
    avoid: [],
  },
  [INGREDIENT_SLUGS.CYCLOPENTASILOXANE]: {
    primary: [SKINCARE_INGREDIENT_TAG_SLUGS.EXCIPIENT, SKINCARE_INGREDIENT_TAG_SLUGS.EMOLLIENT],
    secondary: [],
    avoid: [],
  },
  [INGREDIENT_SLUGS.PHENYL_TRIMETHICONE]: {
    primary: [SKINCARE_INGREDIENT_TAG_SLUGS.EMOLLIENT, SKINCARE_INGREDIENT_TAG_SLUGS.ECLAT],
    secondary: [],
    avoid: [],
  },
  [INGREDIENT_SLUGS.PIROCTONE_OLAMINE]: {
    primary: [SKINCARE_INGREDIENT_TAG_SLUGS.ANTISEPTIQUE],
    secondary: [SKINCARE_INGREDIENT_TAG_SLUGS.ANTI_ACNE],
    avoid: [],
  },
  [INGREDIENT_SLUGS.COCO_GLUCOSIDE]: {
    primary: [SKINCARE_INGREDIENT_TAG_SLUGS.TENSIOACTIF],
    secondary: [
      SKINCARE_INGREDIENT_TAG_SLUGS.PEAU_SENSIBLE,
      SKINCARE_INGREDIENT_TAG_SLUGS.NON_COMEDOGENE,
    ],
    avoid: [],
  },
  [INGREDIENT_SLUGS.DECYL_GLUCOSIDE]: {
    primary: [SKINCARE_INGREDIENT_TAG_SLUGS.TENSIOACTIF],
    secondary: [SKINCARE_INGREDIENT_TAG_SLUGS.PEAU_SECHE],
    avoid: [],
  },
  [INGREDIENT_SLUGS.SODIUM_COCOYL_ISETHIONATE]: {
    primary: [SKINCARE_INGREDIENT_TAG_SLUGS.TENSIOACTIF],
    secondary: [
      SKINCARE_INGREDIENT_TAG_SLUGS.PEAU_SECHE,
      SKINCARE_INGREDIENT_TAG_SLUGS.PEAU_NORMALE,
    ],
    avoid: [],
  },

  // Tensioactifs anioniques forts (SLS, SLES & ammonium variants)
  [HAIR_TENSIOACTIFS_ANIONIQUES.SLS_HAIR]: {
    primary: [H.TENSIOACTIF_DOUX],
    secondary: [H.CHEVEUX_GRAS],
    avoid: [H.CUIR_CHEVELU_SENSIBLE, H.CUIR_CHEVELU_IRRITE, H.POST_COLORATION],
  },
  [HAIR_TENSIOACTIFS_ANIONIQUES.SLES_HAIR]: {
    primary: [H.TENSIOACTIF_DOUX],
    secondary: [H.CHEVEUX_GRAS],
    avoid: [H.CUIR_CHEVELU_SENSIBLE, H.POST_COLORATION],
  },
  [HAIR_TENSIOACTIFS_ANIONIQUES.AMMONIUM_LAURYL_SULFATE]: {
    primary: [H.TENSIOACTIF_DOUX],
    secondary: [H.CHEVEUX_GRAS],
    avoid: [H.CUIR_CHEVELU_SENSIBLE, H.CUIR_CHEVELU_IRRITE, H.POST_COLORATION],
  },
  [HAIR_TENSIOACTIFS_ANIONIQUES.AMMONIUM_LAURETH_SULFATE]: {
    primary: [H.TENSIOACTIF_DOUX],
    secondary: [H.CHEVEUX_GRAS],
    avoid: [H.CUIR_CHEVELU_SENSIBLE, H.POST_COLORATION],
  },
  [HAIR_TENSIOACTIFS_ANIONIQUES.SODIUM_COCO_SULFATE]: {
    primary: [H.TENSIOACTIF_DOUX],
    secondary: [H.CHEVEUX_GRAS],
    avoid: [H.CUIR_CHEVELU_SENSIBLE, H.POST_COLORATION],
  },

  // Tensioactifs anioniques doux (SCI, glutamates, sarcosinates)
  [HAIR_TENSIOACTIFS_ANIONIQUES.SODIUM_COCOYL_SULFATE]: {
    primary: [H.TENSIOACTIF_DOUX],
    secondary: [H.CHEVEUX_TOUS_TYPES],
    avoid: [],
  },
  [HAIR_TENSIOACTIFS_ANIONIQUES.DISODIUM_LAURETH_SULFOSUCCINATE]: {
    primary: [H.TENSIOACTIF_DOUX],
    secondary: [H.CUIR_CHEVELU_SENSIBLE, H.CHEVEUX_TOUS_TYPES],
    avoid: [],
  },
  [HAIR_TENSIOACTIFS_ANIONIQUES.SODIUM_LAUROYL_SARCOSINATE]: {
    primary: [H.TENSIOACTIF_DOUX],
    secondary: [H.CUIR_CHEVELU_SENSIBLE],
    avoid: [],
  },
  [HAIR_TENSIOACTIFS_ANIONIQUES.SODIUM_COCOYL_GLUTAMATE]: {
    primary: [H.TENSIOACTIF_DOUX],
    secondary: [H.CUIR_CHEVELU_SENSIBLE, H.POST_COLORATION],
    avoid: [],
  },
  [HAIR_TENSIOACTIFS_ANIONIQUES.SODIUM_LAUROYL_GLUTAMATE]: {
    primary: [H.TENSIOACTIF_DOUX],
    secondary: [H.CUIR_CHEVELU_SENSIBLE, H.POST_COLORATION],
    avoid: [],
  },
  [HAIR_TENSIOACTIFS_ANIONIQUES.SODIUM_LAURYL_METHYL_ISETHIONATE]: {
    primary: [H.TENSIOACTIF_DOUX],
    secondary: [H.CHEVEUX_TOUS_TYPES],
    avoid: [],
  },
  [HAIR_TENSIOACTIFS_ANIONIQUES.TEA_LAURYL_SULFATE]: {
    primary: [H.TENSIOACTIF_DOUX],
    secondary: [H.CHEVEUX_GRAS],
    avoid: [H.CUIR_CHEVELU_SENSIBLE],
  },

  // Tensioactifs amphotères
  [HAIR_TENSIOACTIFS_AMPHOTERES.COCAMIDOPROPYL_BETAINE]: {
    primary: [H.TENSIOACTIF_DOUX],
    secondary: [H.CUIR_CHEVELU_SENSIBLE, H.CHEVEUX_TOUS_TYPES],
    avoid: [],
  },
  [HAIR_TENSIOACTIFS_AMPHOTERES.COCO_BETAINE]: {
    primary: [H.TENSIOACTIF_DOUX],
    secondary: [H.CUIR_CHEVELU_SENSIBLE, H.CHEVEUX_TOUS_TYPES],
    avoid: [],
  },
  [HAIR_TENSIOACTIFS_AMPHOTERES.SODIUM_COCOAMPHOACETATE]: {
    primary: [H.TENSIOACTIF_DOUX],
    secondary: [H.CUIR_CHEVELU_SENSIBLE],
    avoid: [],
  },
  [HAIR_TENSIOACTIFS_AMPHOTERES.DISODIUM_COCOAMPHODIACETATE]: {
    primary: [H.TENSIOACTIF_DOUX],
    secondary: [H.CUIR_CHEVELU_SENSIBLE],
    avoid: [],
  },

  // Tensioactifs non-ioniques (glucosides + polysorbates)
  [HAIR_TENSIOACTIFS_NON_IONIQUES.LAURYL_GLUCOSIDE]: {
    primary: [H.TENSIOACTIF_DOUX],
    secondary: [H.CUIR_CHEVELU_SENSIBLE],
    avoid: [],
  },
  [HAIR_TENSIOACTIFS_NON_IONIQUES.CAPRYLYL_CAPRYL_GLUCOSIDE]: {
    primary: [H.TENSIOACTIF_DOUX],
    secondary: [H.CUIR_CHEVELU_SENSIBLE, H.CUIR_CHEVELU_IRRITE],
    avoid: [],
  },
  [HAIR_TENSIOACTIFS_NON_IONIQUES.POLYSORBATE_20]: {
    primary: [SKINCARE_INGREDIENT_TAG_SLUGS.EXCIPIENT],
    secondary: [],
    avoid: [],
  },
  [HAIR_TENSIOACTIFS_NON_IONIQUES.POLYSORBATE_60]: {
    primary: [SKINCARE_INGREDIENT_TAG_SLUGS.EXCIPIENT],
    secondary: [],
    avoid: [],
  },
  [HAIR_TENSIOACTIFS_NON_IONIQUES.POLYSORBATE_80]: {
    primary: [SKINCARE_INGREDIENT_TAG_SLUGS.EXCIPIENT],
    secondary: [],
    avoid: [],
  },

  // Tensioactifs cationiques (après-shampoings, démêlants)
  [HAIR_TENSIOACTIFS_CATIONIQUES.BEHENTRIMONIUM_CHLORIDE]: {
    primary: [H.CONDITIONNEUR_CATIONIQUE],
    secondary: [H.DOUCEUR, H.DEFINITION_BOUCLES, H.CHEVEUX_SECS],
    avoid: [],
  },
  [HAIR_TENSIOACTIFS_CATIONIQUES.BEHENTRIMONIUM_METHOSULFATE]: {
    primary: [H.CONDITIONNEUR_CATIONIQUE],
    secondary: [H.DOUCEUR, H.DEFINITION_BOUCLES, H.CHEVEUX_SECS, H.CUIR_CHEVELU_SENSIBLE],
    avoid: [],
  },
  [HAIR_TENSIOACTIFS_CATIONIQUES.CETRIMONIUM_CHLORIDE]: {
    primary: [H.CONDITIONNEUR_CATIONIQUE],
    secondary: [H.DOUCEUR, H.FINS],
    avoid: [],
  },
  [HAIR_TENSIOACTIFS_CATIONIQUES.CETRIMONIUM_BROMIDE]: {
    primary: [H.CONDITIONNEUR_CATIONIQUE],
    secondary: [H.DOUCEUR, H.CUIR_CHEVELU_IRRITE],
    avoid: [],
  },
  [HAIR_TENSIOACTIFS_CATIONIQUES.STEARALKONIUM_CHLORIDE]: {
    primary: [H.CONDITIONNEUR_CATIONIQUE],
    secondary: [H.DOUCEUR, H.DEFINITION_BOUCLES],
    avoid: [],
  },

  // Alcools gras (conditionneurs texturants)
  [HAIR_CONDITIONNEURS.CETYL_ALCOHOL_HAIR]: {
    primary: [H.EMOLLIENT],
    secondary: [H.DOUCEUR, H.CHEVEUX_SECS],
    avoid: [],
  },
  [HAIR_CONDITIONNEURS.CETEARYL_ALCOHOL_HAIR]: {
    primary: [H.EMOLLIENT],
    secondary: [H.DOUCEUR, H.CHEVEUX_SECS],
    avoid: [],
  },
  [HAIR_CONDITIONNEURS.STEARYL_ALCOHOL_HAIR]: {
    primary: [H.EMOLLIENT],
    secondary: [H.DOUCEUR, H.CHEVEUX_SECS],
    avoid: [],
  },
  [HAIR_CONDITIONNEURS.ARACHIDYL_BEHENYL_ALCOHOL]: {
    primary: [H.EMOLLIENT],
    secondary: [H.DOUCEUR, H.CHEVEUX_SECS],
    avoid: [],
  },

  // Silicones (film protecteur, brillance, discipline)
  [HAIR_CONDITIONNEURS.DIMETHICONE_HAIR]: {
    primary: [H.FILM_PROTECTEUR],
    secondary: [H.BRILLANCE, H.DISCIPLINE, H.FRISOTTIS],
    avoid: [H.CHEVEUX_GRAS],
  },
  [HAIR_CONDITIONNEURS.AMODIMETHICONE]: {
    primary: [H.FILM_PROTECTEUR],
    secondary: [H.BRILLANCE, H.POROSITE_EXCESSIVE, H.POST_COLORATION],
    avoid: [],
  },
  [HAIR_CONDITIONNEURS.CYCLOTETRASILOXANE]: {
    primary: [H.FILM_PROTECTEUR],
    secondary: [H.BRILLANCE, H.DISCIPLINE],
    avoid: [],
  },
  [HAIR_CONDITIONNEURS.POLYSILICONE_15]: {
    primary: [H.FILM_PROTECTEUR],
    secondary: [H.POST_COLORATION],
    avoid: [],
  },
  [HAIR_CONDITIONNEURS.TRIMETHYLSILYLAMODIMETHICONE]: {
    primary: [H.FILM_PROTECTEUR],
    secondary: [H.BRILLANCE, H.FRISOTTIS],
    avoid: [],
  },
  [HAIR_CONDITIONNEURS.SILICONE_QUATERNIUM_8]: {
    primary: [H.CONDITIONNEUR_CATIONIQUE, H.FILM_PROTECTEUR],
    secondary: [H.DOUCEUR, H.CASSE],
    avoid: [],
  },
  [HAIR_CONDITIONNEURS.SILICONE_QUATERNIUM_16]: {
    primary: [H.CONDITIONNEUR_CATIONIQUE, H.FILM_PROTECTEUR],
    secondary: [H.DOUCEUR],
    avoid: [],
  },
  [HAIR_CONDITIONNEURS.SILICONE_QUATERNIUM_22]: {
    primary: [H.CONDITIONNEUR_CATIONIQUE, H.FILM_PROTECTEUR],
    secondary: [H.DOUCEUR, H.FINS],
    avoid: [],
  },

  // Polymères conditionneurs
  [HAIR_CONDITIONNEURS.POLYQUATERNIUM_7]: {
    primary: [H.CONDITIONNEUR_CATIONIQUE],
    secondary: [H.VOLUME, H.FRISOTTIS],
    avoid: [],
  },
  [HAIR_CONDITIONNEURS.POLYQUATERNIUM_10]: {
    primary: [H.CONDITIONNEUR_CATIONIQUE],
    secondary: [H.DOUCEUR, H.CHEVEUX_TOUS_TYPES],
    avoid: [],
  },
  [HAIR_CONDITIONNEURS.POLYQUATERNIUM_11]: {
    primary: [H.CONDITIONNEUR_CATIONIQUE],
    secondary: [H.FIXATION, H.DISCIPLINE],
    avoid: [],
  },
  [HAIR_CONDITIONNEURS.POLYQUATERNIUM_37]: {
    primary: [H.GAINANT, H.CONDITIONNEUR_CATIONIQUE],
    secondary: [H.GAINAGE, H.DEFINITION_BOUCLES],
    avoid: [],
  },
  [HAIR_CONDITIONNEURS.POLYQUATERNIUM_44]: {
    primary: [H.CONDITIONNEUR_CATIONIQUE, H.FILM_PROTECTEUR],
    secondary: [H.BRILLANCE, H.DISCIPLINE],
    avoid: [],
  },
  [HAIR_CONDITIONNEURS.POLYQUATERNIUM_55]: {
    primary: [H.CONDITIONNEUR_CATIONIQUE],
    secondary: [H.FIXATION],
    avoid: [],
  },
  [HAIR_CONDITIONNEURS.GUAR_HYDROXYPROPYLTRIMONIUM_CHLORIDE]: {
    primary: [H.CONDITIONNEUR_CATIONIQUE],
    secondary: [H.DOUCEUR, H.CHEVEUX_SECS, H.BOUCLES],
    avoid: [],
  },
  [HAIR_CONDITIONNEURS.HYDROXYPROPYL_GUAR]: {
    primary: [H.GAINANT],
    secondary: [H.DOUCEUR],
    avoid: [],
  },
  [HAIR_CONDITIONNEURS.HONEYQUAT]: {
    primary: [H.HUMECTANT, H.CONDITIONNEUR_CATIONIQUE],
    secondary: [H.HYDRATATION, H.DOUCEUR],
    avoid: [],
  },

  // Humectants
  [HAIR_HUMECTANTS.AQUA_HAIR]: {
    primary: [SKINCARE_INGREDIENT_TAG_SLUGS.EXCIPIENT],
    secondary: [],
    avoid: [],
  },
  [HAIR_HUMECTANTS.GLYCERIN_HAIR]: {
    primary: [H.HUMECTANT],
    secondary: [H.HYDRATATION, H.CHEVEUX_SECS, H.CHEVEUX_TOUS_TYPES],
    avoid: [],
  },
  [HAIR_HUMECTANTS.PROPYLENE_GLYCOL_HAIR]: {
    primary: [H.HUMECTANT],
    secondary: [H.HYDRATATION],
    avoid: [],
  },
  [HAIR_HUMECTANTS.BUTYLENE_GLYCOL_HAIR]: {
    primary: [H.HUMECTANT],
    secondary: [H.HYDRATATION],
    avoid: [],
  },
  [HAIR_HUMECTANTS.PENTYLENE_GLYCOL_HAIR]: {
    primary: [H.HUMECTANT],
    secondary: [H.HYDRATATION],
    avoid: [],
  },
  [HAIR_HUMECTANTS.SORBITOL_HAIR]: {
    primary: [H.HUMECTANT],
    secondary: [H.HYDRATATION],
    avoid: [],
  },
  [HAIR_HUMECTANTS.SODIUM_PCA_HAIR]: {
    primary: [H.HUMECTANT],
    secondary: [H.HYDRATATION, H.CHEVEUX_SECS],
    avoid: [],
  },
  [HAIR_HUMECTANTS.PANTHENOL_HAIR]: {
    primary: [H.HUMECTANT],
    secondary: [H.HYDRATATION, H.CASSE, H.CUIR_CHEVELU_IRRITE],
    avoid: [],
  },
  [HAIR_HUMECTANTS.ALOE_VERA_HAIR]: {
    primary: [H.HUMECTANT],
    secondary: [H.HYDRATATION, H.CUIR_CHEVELU_IRRITE, H.CUIR_CHEVELU_SENSIBLE],
    avoid: [],
  },
  [HAIR_HUMECTANTS.HYALURONIC_ACID_HAIR]: {
    primary: [H.HUMECTANT],
    secondary: [H.HYDRATATION, H.CHEVEUX_SECS],
    avoid: [],
  },
  [HAIR_HUMECTANTS.SODIUM_HYALURONATE_HAIR]: {
    primary: [H.HUMECTANT],
    secondary: [H.HYDRATATION, H.POROSITE_EXCESSIVE],
    avoid: [],
  },
  [HAIR_HUMECTANTS.BETAINE_HAIR]: {
    primary: [H.HUMECTANT],
    secondary: [H.HYDRATATION, H.CUIR_CHEVELU_SENSIBLE],
    avoid: [],
  },
  [HAIR_HUMECTANTS.FRUCTOSE_HAIR]: {
    primary: [H.HUMECTANT],
    secondary: [H.HYDRATATION],
    avoid: [],
  },
  [HAIR_HUMECTANTS.TREHALOSE_HAIR]: {
    primary: [H.HUMECTANT],
    secondary: [H.HYDRATATION, H.POROSITE_EXCESSIVE, H.CASSE],
    avoid: [],
  },
  [HAIR_HUMECTANTS.ALLANTOIN_HAIR]: {
    primary: [H.HUMECTANT],
    secondary: [H.CUIR_CHEVELU_SENSIBLE, H.CUIR_CHEVELU_IRRITE],
    avoid: [],
  },

  // Huiles végétales
  [HAIR_HUILES_VEGETALES.ARGAN_OIL_HAIR]: {
    primary: [H.EMOLLIENT, H.NUTRITION],
    secondary: [H.BRILLANCE, H.CHEVEUX_SECS, H.POINTES_SECHES],
    avoid: [],
  },
  [HAIR_HUILES_VEGETALES.COCONUT_OIL_HAIR]: {
    primary: [H.EMOLLIENT, H.NUTRITION],
    secondary: [H.CASSE, H.CHEVEUX_SECS, H.POINTES_SECHES],
    avoid: [],
  },
  [HAIR_HUILES_VEGETALES.JOJOBA_OIL_HAIR]: {
    primary: [H.EMOLLIENT],
    secondary: [H.BRILLANCE, H.CUIR_CHEVELU_SENSIBLE],
    avoid: [],
  },
  [HAIR_HUILES_VEGETALES.OLIVE_OIL_HAIR]: {
    primary: [H.EMOLLIENT, H.NUTRITION],
    secondary: [H.CHEVEUX_SECS, H.CREPUS],
    avoid: [],
  },
  [HAIR_HUILES_VEGETALES.AVOCADO_OIL_HAIR]: {
    primary: [H.EMOLLIENT, H.NUTRITION],
    secondary: [H.CHEVEUX_SECS, H.POINTES_SECHES],
    avoid: [],
  },
  [HAIR_HUILES_VEGETALES.CASTOR_OIL_HAIR]: {
    primary: [H.EMOLLIENT],
    secondary: [H.STIMULANT_FOLLICULE, H.CHEVEUX_SECS, H.CREPUS],
    avoid: [],
  },
  [HAIR_HUILES_VEGETALES.HEMP_OIL_HAIR]: {
    primary: [H.EMOLLIENT, H.NUTRITION],
    secondary: [H.CUIR_CHEVELU_IRRITE, H.CHEVEUX_SECS],
    avoid: [],
  },
  [HAIR_HUILES_VEGETALES.SUNFLOWER_OIL_HAIR]: {
    primary: [H.EMOLLIENT],
    secondary: [H.CHEVEUX_TOUS_TYPES],
    avoid: [],
  },
  [HAIR_HUILES_VEGETALES.MACADAMIA_OIL_HAIR]: {
    primary: [H.EMOLLIENT, H.NUTRITION],
    secondary: [H.BRILLANCE, H.DOUCEUR],
    avoid: [],
  },
  [HAIR_HUILES_VEGETALES.ALMOND_OIL_HAIR]: {
    primary: [H.EMOLLIENT],
    secondary: [H.DOUCEUR, H.CHEVEUX_SECS],
    avoid: [],
  },
  [HAIR_HUILES_VEGETALES.ROSEHIP_OIL_HAIR]: {
    primary: [H.EMOLLIENT],
    secondary: [H.POINTES_SECHES, H.FOURCHES],
    avoid: [],
  },
  [HAIR_HUILES_VEGETALES.CAMELLIA_SINENSIS_OIL_HAIR]: {
    primary: [H.EMOLLIENT],
    secondary: [H.BRILLANCE, H.FINS],
    avoid: [],
  },
  [HAIR_HUILES_VEGETALES.MORINGA_OIL_HAIR]: {
    primary: [H.EMOLLIENT],
    secondary: [H.ANTI_PELLICULAIRE, H.CUIR_CHEVELU_IRRITE],
    avoid: [],
  },
  [HAIR_HUILES_VEGETALES.HAZELNUT_OIL_HAIR]: {
    primary: [H.EMOLLIENT],
    secondary: [H.CHEVEUX_GRAS, H.FINS],
    avoid: [],
  },
  [HAIR_HUILES_VEGETALES.BLACK_SEED_OIL_HAIR]: {
    primary: [H.EMOLLIENT, H.ANTI_PELLICULAIRE],
    secondary: [H.PELLICULES, H.CUIR_CHEVELU_IRRITE],
    avoid: [],
  },
  [HAIR_HUILES_VEGETALES.SAFFLOWER_OIL_HAIR]: {
    primary: [H.EMOLLIENT],
    secondary: [H.CHEVEUX_SECS],
    avoid: [],
  },
  [HAIR_HUILES_VEGETALES.HYDROGENATED_CASTOR_OIL_HAIR]: {
    primary: [H.FILM_PROTECTEUR],
    secondary: [H.BRILLANCE, H.DISCIPLINE],
    avoid: [],
  },
  [HAIR_HUILES_VEGETALES.BAOBAB_OIL_HAIR]: {
    primary: [H.EMOLLIENT, H.NUTRITION],
    secondary: [H.POROSITE_EXCESSIVE, H.CHEVEUX_SECS],
    avoid: [],
  },

  // Beurres végétaux
  [HAIR_BEURRES_VEGETAUX.SHEA_BUTTER_HAIR]: {
    primary: [H.EMOLLIENT, H.NUTRITION],
    secondary: [H.CHEVEUX_SECS, H.CREPUS, H.POINTES_SECHES],
    avoid: [H.CHEVEUX_GRAS, H.FINS],
  },
  [HAIR_BEURRES_VEGETAUX.CACAO_BUTTER_HAIR]: {
    primary: [H.EMOLLIENT, H.NUTRITION],
    secondary: [H.BRILLANCE, H.CHEVEUX_SECS],
    avoid: [H.FINS],
  },
  [HAIR_BEURRES_VEGETAUX.MANGO_BUTTER_HAIR]: {
    primary: [H.EMOLLIENT, H.NUTRITION],
    secondary: [H.BRILLANCE, H.CHEVEUX_SECS, H.CREPUS],
    avoid: [],
  },
  [HAIR_BEURRES_VEGETAUX.SAL_BUTTER_HAIR]: {
    primary: [H.EMOLLIENT, H.NUTRITION],
    secondary: [H.CHEVEUX_SECS, H.CREPUS],
    avoid: [],
  },
  [HAIR_BEURRES_VEGETAUX.MADHUCA_LONGIFOLIA_BUTTER]: {
    primary: [H.EMOLLIENT, H.NUTRITION],
    secondary: [H.CHEVEUX_SECS, H.CREPUS],
    avoid: [],
  },

  // Protéines hydrolysées
  [HAIR_PROTEINES.HYDROLYZED_KERATIN]: {
    primary: [H.PROTEINE],
    secondary: [H.CASSE, H.FOURCHES, H.POST_COLORATION],
    avoid: [],
  },
  [HAIR_PROTEINES.HYDROLYZED_WHEAT_PROTEIN]: {
    primary: [H.PROTEINE],
    secondary: [H.CASSE, H.HYDRATATION],
    avoid: [],
  },
  [HAIR_PROTEINES.HYDROLYZED_SILK]: {
    primary: [H.PROTEINE],
    secondary: [H.BRILLANCE, H.DOUCEUR],
    avoid: [],
  },
  [HAIR_PROTEINES.HYDROLYZED_SOY_PROTEIN]: {
    primary: [H.PROTEINE],
    secondary: [H.MANQUE_VOLUME, H.FINS],
    avoid: [],
  },
  [HAIR_PROTEINES.HYDROLYZED_COLLAGEN_HAIR]: {
    primary: [H.PROTEINE],
    secondary: [H.HYDRATATION, H.CASSE],
    avoid: [],
  },
  [HAIR_PROTEINES.HYDROLYZED_RICE_PROTEIN]: {
    primary: [H.PROTEINE],
    secondary: [H.MANQUE_VOLUME, H.CASSE],
    avoid: [],
  },
  [HAIR_PROTEINES.HYDROLYZED_OAT_PROTEIN]: {
    primary: [H.PROTEINE],
    secondary: [H.CUIR_CHEVELU_IRRITE, H.DOUCEUR],
    avoid: [],
  },
  [HAIR_PROTEINES.HYDROLYZED_QUINOA_PROTEIN]: {
    primary: [H.PROTEINE],
    secondary: [H.LISSANT, H.POST_COLORATION],
    avoid: [],
  },
  [HAIR_PROTEINES.WHEAT_AMINO_ACIDS]: {
    primary: [H.PROTEINE],
    secondary: [H.HYDRATATION, H.BRILLANCE],
    avoid: [],
  },
  [HAIR_PROTEINES.SILK_AMINO_ACIDS]: {
    primary: [H.PROTEINE],
    secondary: [H.BRILLANCE, H.DOUCEUR],
    avoid: [],
  },
  [HAIR_PROTEINES.ARGININE_HAIR]: {
    primary: [H.PROTEINE],
    secondary: [H.POST_COLORATION, H.CASSE],
    avoid: [],
  },

  // Céramides & lipides de cuticule
  [HAIR_CERAMIDES_LIPIDES.CERAMIDE_NP_HAIR]: {
    primary: [H.FILM_PROTECTEUR],
    secondary: [H.CASSE, H.POROSITE_EXCESSIVE, H.FOURCHES],
    avoid: [],
  },
  [HAIR_CERAMIDES_LIPIDES.CERAMIDE_AP_HAIR]: {
    primary: [H.FILM_PROTECTEUR],
    secondary: [H.CASSE, H.POROSITE_EXCESSIVE],
    avoid: [],
  },
  [HAIR_CERAMIDES_LIPIDES.CERAMIDE_EOP_HAIR]: {
    primary: [H.FILM_PROTECTEUR],
    secondary: [H.CASSE, H.POROSITE_EXCESSIVE],
    avoid: [],
  },
  [HAIR_CERAMIDES_LIPIDES.CERAMIDE_NS_HAIR]: {
    primary: [H.FILM_PROTECTEUR],
    secondary: [H.CASSE, H.POROSITE_EXCESSIVE],
    avoid: [],
  },
  [HAIR_CERAMIDES_LIPIDES.CERAMIDE_AS_HAIR]: {
    primary: [H.FILM_PROTECTEUR],
    secondary: [H.CASSE, H.POROSITE_EXCESSIVE],
    avoid: [],
  },
  [HAIR_CERAMIDES_LIPIDES.CERAMIDE_2_HAIR]: {
    primary: [H.FILM_PROTECTEUR],
    secondary: [H.CASSE, H.POROSITE_EXCESSIVE],
    avoid: [],
  },
  [HAIR_CERAMIDES_LIPIDES.CERAMIDE_3_HAIR]: {
    primary: [H.FILM_PROTECTEUR],
    secondary: [H.CASSE, H.POROSITE_EXCESSIVE],
    avoid: [],
  },
  [HAIR_CERAMIDES_LIPIDES.PHYTOSPHINGOSINE_HAIR]: {
    primary: [H.FILM_PROTECTEUR],
    secondary: [H.CUIR_CHEVELU_SENSIBLE, H.PELLICULES],
    avoid: [],
  },
  [HAIR_CERAMIDES_LIPIDES.CHOLESTEROL_HAIR]: {
    primary: [H.FILM_PROTECTEUR, H.EMOLLIENT],
    secondary: [H.CHEVEUX_SECS, H.POROSITE_EXCESSIVE],
    avoid: [],
  },
  [HAIR_CERAMIDES_LIPIDES.LINOLEIC_ACID_HAIR]: {
    primary: [H.EMOLLIENT],
    secondary: [H.POROSITE_EXCESSIVE],
    avoid: [],
  },
  [HAIR_CERAMIDES_LIPIDES.OLEIC_ACID_HAIR]: {
    primary: [H.EMOLLIENT],
    secondary: [H.POROSITE_EXCESSIVE, H.CHEVEUX_SECS],
    avoid: [],
  },
  [HAIR_CERAMIDES_LIPIDES.BEHENIC_ACID]: {
    primary: [H.EMOLLIENT],
    secondary: [H.DOUCEUR],
    avoid: [],
  },

  // Épaississants / texturants
  [HAIR_EPAISSISSANTS.CARBOMER_HAIR]: {
    primary: [H.GAINANT],
    secondary: [H.GAINAGE],
    avoid: [],
  },
  [HAIR_EPAISSISSANTS.ACRYLATES_COPOLYMER_HAIR]: {
    primary: [H.GAINANT, H.FILM_PROTECTEUR],
    secondary: [H.FIXATION, H.GAINAGE],
    avoid: [],
  },
  [HAIR_EPAISSISSANTS.XANTHAN_GUM_HAIR]: {
    primary: [H.GAINANT],
    secondary: [H.GAINAGE, H.DEFINITION_BOUCLES],
    avoid: [],
  },
  [HAIR_EPAISSISSANTS.CELLULOSE_GUM_HAIR]: {
    primary: [H.GAINANT],
    secondary: [H.GAINAGE],
    avoid: [],
  },
  [HAIR_EPAISSISSANTS.PEG_120_METHYL_GLUCOSE_DIOLEATE]: {
    primary: [H.GAINANT],
    secondary: [],
    avoid: [],
  },
  [HAIR_EPAISSISSANTS.SODIUM_ALGINATE_HAIR]: {
    primary: [H.GAINANT],
    secondary: [H.GAINAGE, H.DEFINITION_BOUCLES],
    avoid: [],
  },
  [HAIR_EPAISSISSANTS.TARA_GUM]: {
    primary: [H.GAINANT],
    secondary: [H.GAINAGE],
    avoid: [],
  },
  [HAIR_EPAISSISSANTS.CETEARYL_GLUCOSIDE]: {
    primary: [H.EMOLLIENT],
    secondary: [H.DOUCEUR],
    avoid: [],
  },
  [HAIR_EPAISSISSANTS.PEG_40_HYDROGENATED_CASTOR_OIL]: {
    primary: [SKINCARE_INGREDIENT_TAG_SLUGS.EXCIPIENT],
    secondary: [],
    avoid: [],
  },

  // Antipelliculaires
  [HAIR_ANTIPELLICULAIRES.ZINC_PYRITHIONE]: {
    primary: [H.ANTI_PELLICULAIRE],
    secondary: [H.PELLICULES, H.CUIR_CHEVELU_IRRITE],
    avoid: [],
  },
  [HAIR_ANTIPELLICULAIRES.SELENIUM_SULFIDE]: {
    primary: [H.ANTI_PELLICULAIRE],
    secondary: [H.PELLICULES, H.CUIR_CHEVELU_IRRITE],
    avoid: [H.CUIR_CHEVELU_SENSIBLE, H.POST_COLORATION],
  },
  [HAIR_ANTIPELLICULAIRES.SALICYLIC_ACID_HAIR]: {
    primary: [H.ANTI_PELLICULAIRE],
    secondary: [H.PELLICULES, H.CUIR_CHEVELU_IRRITE],
    avoid: [H.CUIR_CHEVELU_SENSIBLE],
  },
  [HAIR_ANTIPELLICULAIRES.KETOCONAZOLE]: {
    primary: [H.ANTI_PELLICULAIRE],
    secondary: [H.PELLICULES, H.CUIR_CHEVELU_IRRITE],
    avoid: [H.CUIR_CHEVELU_SENSIBLE],
  },
  [HAIR_ANTIPELLICULAIRES.COAL_TAR]: {
    primary: [H.ANTI_PELLICULAIRE],
    secondary: [H.PELLICULES, H.CUIR_CHEVELU_IRRITE],
    avoid: [H.CUIR_CHEVELU_SENSIBLE, H.POST_COLORATION],
  },
  [HAIR_ANTIPELLICULAIRES.CLIMBAZOLE]: {
    primary: [H.ANTI_PELLICULAIRE],
    secondary: [H.PELLICULES, H.CUIR_CHEVELU_IRRITE],
    avoid: [],
  },
  [HAIR_ANTIPELLICULAIRES.TEA_TREE_OIL_HAIR]: {
    primary: [H.ANTI_PELLICULAIRE],
    secondary: [H.PELLICULES, H.CUIR_CHEVELU_IRRITE],
    avoid: [H.CUIR_CHEVELU_SENSIBLE],
  },
  [HAIR_ANTIPELLICULAIRES.SULFUR_HAIR]: {
    primary: [H.ANTI_PELLICULAIRE],
    secondary: [H.PELLICULES, H.CUIR_CHEVELU_IRRITE],
    avoid: [H.CUIR_CHEVELU_SENSIBLE],
  },

  // Stimulants de croissance
  [HAIR_STIMULANTS_CROISSANCE.CAFFEINE_HAIR]: {
    primary: [H.STIMULANT_FOLLICULE],
    secondary: [H.CHUTE, H.ALOPECIE],
    avoid: [],
  },
  [HAIR_STIMULANTS_CROISSANCE.NIACINAMIDE_HAIR]: {
    primary: [H.STIMULANT_FOLLICULE],
    secondary: [H.CHUTE, H.CUIR_CHEVELU_SENSIBLE],
    avoid: [],
  },
  [HAIR_STIMULANTS_CROISSANCE.BIOTIN_HAIR]: {
    primary: [H.STIMULANT_FOLLICULE],
    secondary: [H.CASSE, H.CHUTE],
    avoid: [],
  },
  [HAIR_STIMULANTS_CROISSANCE.MINOXIDIL]: {
    primary: [H.STIMULANT_FOLLICULE],
    secondary: [H.ALOPECIE, H.CHUTE],
    avoid: [H.CUIR_CHEVELU_SENSIBLE],
  },
  [HAIR_STIMULANTS_CROISSANCE.CAPIXYL]: {
    primary: [H.STIMULANT_FOLLICULE],
    secondary: [H.CHUTE, H.ALOPECIE],
    avoid: [],
  },
  [HAIR_STIMULANTS_CROISSANCE.REDENSYL]: {
    primary: [H.STIMULANT_FOLLICULE],
    secondary: [H.CHUTE, H.ALOPECIE],
    avoid: [],
  },
  [HAIR_STIMULANTS_CROISSANCE.PROCAPIL]: {
    primary: [H.STIMULANT_FOLLICULE],
    secondary: [H.CHUTE, H.ALOPECIE],
    avoid: [],
  },
  [HAIR_STIMULANTS_CROISSANCE.GINSENG_EXTRACT_HAIR]: {
    primary: [H.STIMULANT_FOLLICULE],
    secondary: [H.CHUTE],
    avoid: [],
  },
  [HAIR_STIMULANTS_CROISSANCE.CRESSON_CAPUCINE_EXTRACT]: {
    primary: [H.STIMULANT_FOLLICULE],
    secondary: [H.CHUTE],
    avoid: [],
  },
  [HAIR_STIMULANTS_CROISSANCE.SAW_PALMETTO]: {
    primary: [H.STIMULANT_FOLLICULE],
    secondary: [H.CHUTE, H.ALOPECIE],
    avoid: [],
  },

  // Chélateurs (compléments au TETRASODIUM_EDTA défini plus haut)
  [HAIR_CHELATEURS.DISODIUM_EDTA_HAIR]: {
    primary: [H.CHELATEUR],
    secondary: [],
    avoid: [],
  },
  [HAIR_CHELATEURS.PHYTIC_ACID_HAIR]: {
    primary: [H.CHELATEUR],
    secondary: [],
    avoid: [],
  },
  [HAIR_CHELATEURS.SODIUM_GLUCONATE_HAIR]: {
    primary: [H.CHELATEUR],
    secondary: [],
    avoid: [],
  },

  // Agents nacrants
  [HAIR_AGENTS_NACRANTS.GLYCOL_DISTEARATE]: {
    primary: [H.FILM_PROTECTEUR],
    secondary: [H.BRILLANCE],
    avoid: [],
  },
  [HAIR_AGENTS_NACRANTS.MICA_HAIR]: {
    primary: [H.FILM_PROTECTEUR],
    secondary: [H.BRILLANCE],
    avoid: [],
  },
  [HAIR_AGENTS_NACRANTS.TITANIUM_DIOXIDE_HAIR]: {
    primary: [H.FILM_PROTECTEUR],
    secondary: [],
    avoid: [],
  },

  // Huiles minérales & cires
  [HAIR_HUILES_MINERALES.PARAFFINUM_LIQUIDUM_HAIR]: {
    primary: [H.FILM_PROTECTEUR],
    secondary: [H.BRILLANCE, H.DISCIPLINE],
    avoid: [H.CHEVEUX_GRAS, H.FINS],
  },
  [HAIR_HUILES_MINERALES.PETROLATUM_HAIR]: {
    primary: [H.FILM_PROTECTEUR],
    secondary: [H.DISCIPLINE, H.CHEVEUX_SECS],
    avoid: [H.CHEVEUX_GRAS, H.FINS],
  },
  [HAIR_HUILES_MINERALES.MINERAL_OIL_HAIR]: {
    primary: [H.FILM_PROTECTEUR],
    secondary: [H.BRILLANCE, H.DISCIPLINE],
    avoid: [H.CHEVEUX_GRAS, H.FINS],
  },
  [HAIR_HUILES_MINERALES.CERESIN_HAIR]: {
    primary: [H.FILM_PROTECTEUR],
    secondary: [H.FIXATION],
    avoid: [H.CHEVEUX_GRAS],
  },
  [HAIR_HUILES_MINERALES.OZOKERITE_HAIR]: {
    primary: [H.FILM_PROTECTEUR],
    secondary: [H.FIXATION],
    avoid: [H.CHEVEUX_GRAS],
  },
  [HAIR_HUILES_MINERALES.CERA_MICROCRISTALLINA_HAIR]: {
    primary: [H.FILM_PROTECTEUR],
    secondary: [H.FIXATION],
    avoid: [H.CHEVEUX_GRAS],
  },

  // Divers (antioxydants, extraits, argiles, poudres ayurvédiques)
  [HAIR_DIVERS.TOCOPHEROL_HAIR]: {
    primary: [H.FILM_PROTECTEUR],
    secondary: [H.POST_COLORATION, H.POINTES_SECHES],
    avoid: [],
  },
  [HAIR_DIVERS.RETINYL_PALMITATE_HAIR]: {
    primary: [H.STIMULANT_FOLLICULE],
    secondary: [H.CHUTE],
    avoid: [H.CUIR_CHEVELU_SENSIBLE],
  },
  [HAIR_DIVERS.COENZYME_Q10_HAIR]: {
    primary: [H.STIMULANT_FOLLICULE],
    secondary: [H.POST_COLORATION],
    avoid: [],
  },
  [HAIR_DIVERS.BAMBOU_EXTRACT_HAIR]: {
    primary: [H.PROTEINE],
    secondary: [H.MANQUE_VOLUME, H.CASSE],
    avoid: [],
  },
  [HAIR_DIVERS.ROMARIN_EXTRACT_HAIR]: {
    primary: [H.STIMULANT_FOLLICULE, H.ANTI_PELLICULAIRE],
    secondary: [H.CHUTE, H.PELLICULES],
    avoid: [],
  },
  [HAIR_DIVERS.KAOLIN_HAIR]: {
    primary: [H.FILM_PROTECTEUR],
    secondary: [H.CHEVEUX_GRAS, H.MANQUE_VOLUME],
    avoid: [],
  },
  [HAIR_DIVERS.ACTIVATED_CHARCOAL_HAIR]: {
    primary: [H.FILM_PROTECTEUR],
    secondary: [H.CHEVEUX_GRAS, H.CUIR_CHEVELU_IRRITE],
    avoid: [],
  },
  [HAIR_DIVERS.BAMBOU_CHARCOAL_HAIR]: {
    primary: [H.FILM_PROTECTEUR],
    secondary: [H.CHEVEUX_GRAS],
    avoid: [],
  },
  [HAIR_DIVERS.SEA_SALT_HAIR]: {
    primary: [H.FILM_PROTECTEUR],
    secondary: [H.VOLUME, H.MANQUE_VOLUME],
    avoid: [H.CHEVEUX_SECS, H.POST_COLORATION],
  },
  [HAIR_DIVERS.SHIKAKAI_HAIR]: {
    primary: [H.TENSIOACTIF_DOUX],
    secondary: [H.CUIR_CHEVELU_SENSIBLE, H.PELLICULES],
    avoid: [],
  },
  [HAIR_DIVERS.REETHA_HAIR]: {
    primary: [H.TENSIOACTIF_DOUX],
    secondary: [H.CUIR_CHEVELU_SENSIBLE],
    avoid: [],
  },
  [HAIR_DIVERS.AMLA_HAIR]: {
    primary: [H.STIMULANT_FOLLICULE],
    secondary: [H.CHUTE, H.BRILLANCE],
    avoid: [],
  },
}
