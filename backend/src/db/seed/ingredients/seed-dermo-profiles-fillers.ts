// All ingredient slugs that are considered "fillers" — functional but not active.
// These get an ingredient_dermo_profiles row with is_filler = true.
export const FILLER_SLUGS: string[] = [
  // Solvants aqueux
  'aqua',
  'glycerin',
  'propylene-glycol',
  'butylene-glycol',
  'pentylene-glycol',
  'propanediol',

  // Ajusteurs de pH & chélateurs
  'citric-acid',
  'sodium-hydroxide',
  'potassium-hydroxide',
  'triethanolamine',
  'tromethamine',
  'sodium-citrate',
  'disodium-edta',
  'tetrasodium-edta',

  // Épaississants / gélifiants
  'carbomer',
  'xanthan-gum',
  'acrylates-c10-30-alkyl-acrylate-crosspolymer',
  'hydroxyethylcellulose',
  'hydroxypropyl-methylcellulose',
  'sodium-polyacrylate',
  'sclerotium-gum',

  // Alcools gras & émulsifiants structurels
  'cetyl-alcohol',
  'stearyl-alcohol',
  'cetearyl-alcohol',
  'behenyl-alcohol',
  'glyceryl-stearate',
  'peg-100-stearate',
  'ceteareth-20',

  // Silicones véhicules
  'dimethicone',
  'dimethiconol',
  'cyclopentasiloxane',
  'cyclohexasiloxane',
  'phenyl-trimethicone',

  // Huiles minérales & hydrocarbures inertes
  'mineral-oil',
  'petrolatum',
  'isohexadecane',
  'isododecane',

  // Esters synthétiques véhicules
  'caprylic-capric-triglyceride',
  'ethylhexyl-palmitate',
  'dicaprylyl-carbonate',
  'coco-caprylate-caprate',

  // Sels ioniques inertes
  'sodium-chloride',
  'potassium-chloride',
]
