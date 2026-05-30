import { DENTAL_INGREDIENT_TAG_SLUGS as D } from '@aurore/shared'

import type { IngredientTagMap } from '../../ingredient-tags'
import { SKINCARE_INGREDIENT_TAG_SLUGS } from '../../tags'
import {
  DENTAL_ABRASIFS,
  DENTAL_ANTI_SENSIBILITE,
  DENTAL_ANTIMICROBIENS,
  DENTAL_BLANCHISSANTS,
  DENTAL_DIVERS,
  DENTAL_EXCIPIENTS,
  DENTAL_REMINERALISATION,
} from './ingredient-slugs'

export const dentalTagMap: IngredientTagMap = {
  // Reminéralisation
  [DENTAL_REMINERALISATION.HYDROXYAPATITE]: {
    primary: [D.REMINERALISANT, D.RENFORCEMENT_EMAIL, D.CARIE],
    secondary: [
      D.SENSIBILITE_DENTINAIRE,
      D.REDUCTION_SENSIBILITE,
      D.EROSION_ACIDE,
      D.TACHES,
      D.ENFANT,
      D.IMPLANTS,
    ],
    avoid: [],
  },
  [DENTAL_REMINERALISATION.CALCIUM_GLYCEROPHOSPHATE]: {
    primary: [D.REMINERALISANT, D.RENFORCEMENT_EMAIL],
    secondary: [D.CARIE, D.EROSION_ACIDE, D.NEUTRALISANT_ACIDE],
    avoid: [],
  },

  // Antimicrobiens / Fluorures
  [DENTAL_ANTIMICROBIENS.SODIUM_FLUORIDE]: {
    primary: [D.FLUORURE, D.REMINERALISANT, D.CARIE],
    secondary: [
      D.EROSION_ACIDE,
      D.RENFORCEMENT_EMAIL,
      D.SENSIBILITE_DENTINAIRE,
      D.ENFANT,
      D.ADULTE,
    ],
    avoid: [],
  },
  [DENTAL_ANTIMICROBIENS.SODIUM_MONOFLUOROPHOSPHATE]: {
    primary: [D.FLUORURE, D.REMINERALISANT, D.CARIE],
    secondary: [D.RENFORCEMENT_EMAIL, D.EROSION_ACIDE],
    avoid: [],
  },
  [DENTAL_ANTIMICROBIENS.CHLORHEXIDINE]: {
    primary: [D.ANTIBACTERIEN, D.GENCIVITE, D.PLAQUE],
    secondary: [D.PARODONTITE, D.ANTI_PLAQUE, D.HALITOSE, D.APAISEMENT_GENCIVES],
    // Taches: chlorhexidine stains teeth with prolonged use — relevant concern
    avoid: [D.TACHES],
  },
  [DENTAL_ANTIMICROBIENS.TEA_TREE_OIL_DENTAL]: {
    primary: [D.ANTIBACTERIEN, D.ANTI_PLAQUE],
    secondary: [D.GENCIVITE, D.HALITOSE, D.APAISEMENT_GENCIVES, D.ANTI_INFLAMMATOIRE],
    avoid: [],
  },
  [DENTAL_ANTIMICROBIENS.CLOVE_OIL_EUGENOL]: {
    primary: [D.ANTIBACTERIEN, D.ANTI_INFLAMMATOIRE],
    secondary: [D.APHTES, D.APAISEMENT_GENCIVES, D.HALITOSE],
    avoid: [],
  },
  [DENTAL_ANTIMICROBIENS.THYMOL]: {
    primary: [D.ANTIBACTERIEN, D.ANTI_PLAQUE],
    secondary: [D.HALITOSE, D.GENCIVITE, D.PARODONTITE],
    avoid: [],
  },

  // Anti-sensibilité
  [DENTAL_ANTI_SENSIBILITE.POTASSIUM_NITRATE]: {
    primary: [D.DESENSIBILISANT, D.SENSIBILITE_DENTINAIRE, D.REDUCTION_SENSIBILITE],
    secondary: [D.ADULTE],
    avoid: [],
  },
  [DENTAL_ANTI_SENSIBILITE.STANNOUS_FLUORIDE]: {
    primary: [D.FLUORURE, D.DESENSIBILISANT, D.SENSIBILITE_DENTINAIRE],
    secondary: [
      D.REMINERALISANT,
      D.CARIE,
      D.GENCIVITE,
      D.RENFORCEMENT_EMAIL,
      D.ANTI_PLAQUE,
      D.REDUCTION_SENSIBILITE,
    ],
    avoid: [],
  },

  // Abrasifs
  [DENTAL_ABRASIFS.HYDRATED_SILICA]: {
    primary: [D.ABRASIF_DOUX, D.TACHES],
    secondary: [D.ADULTE, D.RENFORCEMENT_EMAIL],
    avoid: [],
  },
  [DENTAL_ABRASIFS.CALCIUM_CARBONATE]: {
    primary: [D.ABRASIF_DOUX, D.REMINERALISANT],
    secondary: [D.NEUTRALISANT_ACIDE, D.RENFORCEMENT_EMAIL],
    avoid: [],
  },
  [DENTAL_ABRASIFS.SODIUM_BICARBONATE_DENTAL]: {
    primary: [D.ABRASIF_DOUX, D.NEUTRALISANT_ACIDE],
    secondary: [D.TACHES, D.HALITOSE],
    avoid: [],
  },

  // Blanchissants
  [DENTAL_BLANCHISSANTS.HYDROGEN_PEROXIDE]: {
    primary: [D.BLANCHISSANT, D.TACHES, D.BLANCHEUR],
    secondary: [D.ANTIBACTERIEN, D.HALITOSE],
    // Peroxide aggravates existing sensitivity and acid erosion
    avoid: [D.SENSIBILITE_DENTINAIRE, D.EROSION_ACIDE],
  },
  [DENTAL_BLANCHISSANTS.CARBAMIDE_PEROXIDE]: {
    primary: [D.BLANCHISSANT, D.TACHES, D.BLANCHEUR],
    secondary: [D.ADULTE],
    avoid: [D.SENSIBILITE_DENTINAIRE],
  },

  // Divers
  [DENTAL_DIVERS.XYLITOL_DENTAL]: {
    primary: [D.ANTIBACTERIEN, D.ANTI_PLAQUE, D.CARIE],
    secondary: [D.REMINERALISANT, D.ENFANT, D.DENTS_LAIT, D.HALITOSE],
    avoid: [],
  },
  [DENTAL_DIVERS.MENTHOL_DENTAL]: {
    primary: [D.FRAICHEUR],
    secondary: [D.HALITOSE],
    avoid: [],
  },
  [DENTAL_DIVERS.SODIUM_LAURYL_SULFATE]: {
    primary: [D.ANTI_PLAQUE],
    secondary: [],
    // SLS is a known trigger for aphthous ulcers in susceptible individuals
    avoid: [D.APHTES],
  },

  // Excipients
  // Humectants / thickeners without direct dental action — tagged with the
  // cross-domain `excipient` slug (scope ingredient_attribute, shared with
  // skincare) so filters and audits don't flag them as orphan.
  [DENTAL_EXCIPIENTS.GLYCERIN_DENTAL]: {
    primary: [SKINCARE_INGREDIENT_TAG_SLUGS.EXCIPIENT, SKINCARE_INGREDIENT_TAG_SLUGS.HUMECTANT],
    secondary: [],
    avoid: [],
  },
  [DENTAL_EXCIPIENTS.SORBITOL_DENTAL]: {
    primary: [SKINCARE_INGREDIENT_TAG_SLUGS.EXCIPIENT, SKINCARE_INGREDIENT_TAG_SLUGS.HUMECTANT],
    secondary: [],
    avoid: [],
  },
  [DENTAL_EXCIPIENTS.CARRAGEENAN_DENTAL]: {
    primary: [SKINCARE_INGREDIENT_TAG_SLUGS.EXCIPIENT],
    secondary: [],
    avoid: [],
  },
  [DENTAL_EXCIPIENTS.XANTHAN_GUM_DENTAL]: {
    primary: [SKINCARE_INGREDIENT_TAG_SLUGS.EXCIPIENT],
    secondary: [],
    avoid: [],
  },
}
