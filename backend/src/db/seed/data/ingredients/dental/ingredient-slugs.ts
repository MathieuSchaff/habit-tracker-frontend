// Dental ingredient slug groups. Root ingredient-slugs.ts re-exports from here.

export const DENTAL_ABRASIFS = {
  HYDRATED_SILICA: 'hydrated-silica', // INCI: Hydrated Silica | abrasif doux, polish émail sans éroder
  CALCIUM_CARBONATE: 'calcium-carbonate-dental', // INCI: Calcium Carbonate | abrasif naturel, source de calcium
  SODIUM_BICARBONATE_DENTAL: 'sodium-bicarbonate-dental', // INCI: Sodium Bicarbonate | abrasif léger, neutralise acidité buccale
} as const

export const DENTAL_ANTIMICROBIENS = {
  SODIUM_FLUORIDE: 'sodium-fluoride', // INCI: Sodium Fluoride | protection caries, reminéralisation émail
  SODIUM_MONOFLUOROPHOSPHATE: 'sodium-monofluorophosphate', // INCI: Sodium Monofluorophosphate | source de fluor alternative
  CHLORHEXIDINE: 'chlorhexidine', // INCI: Chlorhexidine Digluconate | antimicrobien bain de bouche
  TEA_TREE_OIL_DENTAL: 'tea-tree-oil-dental', // INCI: Melaleuca Alternifolia Leaf Oil | antimicrobien naturel
  CLOVE_OIL_EUGENOL: 'clove-oil-eugenol', // INCI: Eugenia Caryophyllus Bud Oil / Eugenol | analgésique, antimicrobien
  THYMOL: 'thymol', // INCI: Thymol | antiseptique buccal (Listerine-type)
} as const

export const DENTAL_ANTI_SENSIBILITE = {
  POTASSIUM_NITRATE: 'potassium-nitrate', // INCI: Potassium Nitrate | désensibilise les tubules dentinaires
  STANNOUS_FLUORIDE: 'stannous-fluoride', // INCI: Stannous Fluoride | anti-sensibilité + anti-caries + anti-gingivite
} as const

export const DENTAL_BLANCHISSANTS = {
  HYDROGEN_PEROXIDE: 'hydrogen-peroxide', // INCI: Hydrogen Peroxide | agent blanchissant oxydant
  CARBAMIDE_PEROXIDE: 'carbamide-peroxide', // INCI: Carbamide Peroxide | libère H₂O₂ lentement, blanchiment progressif
} as const

export const DENTAL_REMINERALISATION = {
  HYDROXYAPATITE: 'hydroxyapatite', // INCI: Hydroxyapatite | minéral constitutif de l'émail, reminéralise sans fluor
  CALCIUM_GLYCEROPHOSPHATE: 'calcium-glycerophosphate', // INCI: Calcium Glycerophosphate | source de calcium/phosphate pour émail
} as const

export const DENTAL_EXCIPIENTS = {
  GLYCERIN_DENTAL: 'glycerin-dental', // INCI: Glycerin | humectant/base, prévient dessèchement du dentifrice
  SORBITOL_DENTAL: 'sorbitol-dental', // INCI: Sorbitol | humectant doux, douceur légère sans fermentation
  CARRAGEENAN_DENTAL: 'carrageenan-dental', // INCI: Carrageenan | gélifiant/épaississant d'origine marine
  XANTHAN_GUM_DENTAL: 'xanthan-gum-dental', // INCI: Xanthan Gum | épaississant stabilisant
  CELLULOSE_GUM_DENTAL: 'cellulose-gum-dental', // INCI: Cellulose Gum (CMC) | épaississant cellulosique très répandu
} as const

export const DENTAL_DIVERS = {
  XYLITOL_DENTAL: 'xylitol-dental', // INCI: Xylitol | inhibe Streptococcus mutans, non fermentescible
  MENTHOL_DENTAL: 'menthol-dental', // INCI: Menthol | fraîcheur, légèrement anesthésiant
  SODIUM_LAURYL_SULFATE: 'sodium-lauryl-sulfate', // INCI: Sodium Lauryl Sulfate | tensioactif moussant (controversé muqueuses)
} as const

export const DENTAL_ZINC = {
  ZINC_CITRATE: 'zinc-citrate', // INCI: Zinc Citrate | anti-tartre, anti-plaque, anti-halitose
  ZINC_LACTATE: 'zinc-lactate', // INCI: Zinc Lactate | anti-gingivite, anti-halitose (Meridol)
  ZINC_ACETATE: 'zinc-acetate', // INCI: Zinc Acetate | anti-halitose par neutralisation des VSC (CB12)
  ZINC_CHLORIDE: 'zinc-chloride', // INCI: Zinc Chloride | antiseptique, astringent gingival
  ZINC_PHOSPHATE: 'zinc-phosphate', // INCI: Zinc Phosphate | anti-tartre structurel (Elmex)
  ZINC_SULFATE: 'zinc-sulfate', // INCI: Zinc Sulfate | anti-tartre, anti-inflammatoire gingival léger
} as const

export const DENTAL_ACTIFS_COMPLEMENTAIRES = {
  ARGININE_DENTAL: 'arginine-dental', // INCI: Arginine | occlusion tubulaire anti-sensibilité (Pro-Argin, Elmex)
  CALCIUM_SODIUM_PHOSPHOSILICATE: 'calcium-sodium-phosphosilicate', // INCI: Calcium Sodium Phosphosilicate | biocéramique reminéralisante (Novamin, Sensodyne)
  CETYLPYRIDINIUM_CHLORIDE: 'cetylpyridinium-chloride', // INCI: Cetylpyridinium Chloride | antiseptique buccal (Gum, Meridol)
  TETRASODIUM_PYROPHOSPHATE: 'tetrasodium-pyrophosphate', // INCI: Tetrasodium Pyrophosphate | anti-tartre par chélation Ca²⁺ (Elmex)
} as const

export const DENTAL_TENSIOACTIFS_DOUX = {
  COCAMIDOPROPYL_BETAINE_DENTAL: 'cocamidopropyl-betaine-dental', // INCI: Cocamidopropyl Betaine | tensioactif amphotère doux, alternative SLS
} as const
