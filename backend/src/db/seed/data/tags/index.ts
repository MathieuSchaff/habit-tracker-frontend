import {
  DENTAL_INGREDIENT_TAG_SLUGS,
  DENTAL_INGREDIENT_TAG_TAXONOMY,
  DENTAL_PRODUCT_TAG_SLUGS,
  DENTAL_PRODUCT_TAG_TAXONOMY,
  type DentalIngredientTagSlug,
  type DentalProductTagSlug,
  HAIRCARE_INGREDIENT_TAG_SLUGS,
  HAIRCARE_INGREDIENT_TAG_TAXONOMY,
  type HaircareIngredientTagSlug,
  SKINCARE_INGREDIENT_TAG_SLUGS,
  SKINCARE_INGREDIENT_TAG_TAXONOMY,
  SKINCARE_PRODUCT_TAG_SLUGS,
  SKINCARE_PRODUCT_TAG_TAXONOMY,
  type SkincareIngredientTagSlug,
  type SkincareProductTagSlug,
  SUPPLEMENT_INGREDIENT_TAG_SLUGS,
  SUPPLEMENT_INGREDIENT_TAG_TAXONOMY,
  type SupplementIngredientTagSlug,
} from '@habit-tracker/shared'

// Combined legacy alias — still consumed by other seed modules that have not
// been migrated to the split slug maps yet.
export const TAG_SLUGS = {
  ...SKINCARE_INGREDIENT_TAG_SLUGS,
  ...SKINCARE_PRODUCT_TAG_SLUGS,
  ...SUPPLEMENT_INGREDIENT_TAG_SLUGS,
} as const
export type TagSlug = (typeof TAG_SLUGS)[keyof typeof TAG_SLUGS]

// Shared labels (slug → FR display name). Defined once; reused for both
// ingredient and product tag tables since the shared slugs (concern,
// skin_type, shared_label, skin_effect) carry the same UI label across
// domains.
const TAG_LABELS: Record<string, string> = {
  // Concerns
  'anti-rougeurs': 'Anti-rougeurs',
  rosacee: 'Rosacée',
  couperose: 'Couperose',
  flushs: 'Flushs',
  'barriere-cutanee': 'Barrière cutanée',
  'anti-taches': 'Anti-taches',
  'anti-acne': 'Anti-acné',
  'anti-age': 'Anti-âge',
  hyperpigmentation: 'Hyperpigmentation',
  deshydratation: 'Déshydratation',
  'pores-dilates': 'Pores dilatés',
  'cernes-poches': 'Cernes et poches',
  brillance: 'Brillance',
  eclat: 'Éclat',
  'post-acne': 'Marques post-acné',
  cicatrisation: 'Cicatrisation',
  microbiome: 'Microbiome',
  'photo-vieillissement': 'Photo-vieillissement',
  'teint-terne': 'Teint terne',
  'lumiere-bleue': 'Lumière bleue',
  pollution: 'Pollution',
  eczema: 'Eczéma',
  'grain-peau': 'Grain de peau',
  'keratose-pilaire': 'Kératose pilaire',
  'photo-protection': 'Photoprotection',
  'barriere-cutanee-alteree': 'Barrière altérée',

  // Skin types
  'peau-seche': 'Peau sèche',
  'peau-mixte': 'Peau mixte',
  'peau-grasse': 'Peau grasse',
  'peau-reactive': 'Peau réactive',
  'peau-sensible': 'Peau sensible',
  'peau-normale': 'Peau normale',
  'peau-atopique': 'Peau atopique',
  'peau-rugueuse': 'Peau rugueuse',
  'tous-types': 'Tous types de peau',

  // Skin zones
  'zone-visage': 'Visage',
  'zone-corps': 'Corps',
  'zone-yeux': 'Yeux',
  'zone-levres': 'Lèvres',
  'zone-mains': 'Mains',

  // Product types
  'baume-demaquillant': 'Baume démaquillant',
  'huile-demaquillante': 'Huile démaquillante',
  'huile-nettoyante': 'Huile nettoyante',
  'gel-nettoyant': 'Gel nettoyant',
  'mousse-nettoyante': 'Mousse nettoyante',
  'lait-nettoyant': 'Lait nettoyant',
  'creme-nettoyante': 'Crème nettoyante',
  'eau-micellaire': 'Eau micellaire',
  tonique: 'Tonique',
  essence: 'Essence',
  lotion: 'Lotion',
  brume: 'Brume / Mist',
  primer: 'Primer',
  serum: 'Sérum',
  ampoule: 'Ampoule',
  'huile-visage': 'Huile visage',
  'spot-treatment': 'Traitement ciblé',
  'creme-hydratante': 'Crème hydratante',
  'gel-creme': 'Gel-crème',
  'creme-de-nuit': 'Crème de nuit',
  baume: 'Baume',
  'sleeping-mask': 'Sleeping mask',
  'contour-yeux': 'Contour des yeux',
  'soin-levres': 'Soin lèvres',
  'exfoliant-chimique': 'Exfoliant chimique',
  'exfoliant-physique': 'Exfoliant physique',
  'masque-argile': 'Masque argile',
  'masque-tissu': 'Masque tissu',
  'masque-hydratant': 'Masque hydratant',
  'creme-solaire': 'Crème solaire',
  'creme-solaire-teintee': 'Crème solaire teintée',
  'apres-soleil': 'Après-soleil',
  'auto-bronzant': 'Auto-bronzant',
  'lait-corps': 'Lait corps',
  'creme-corps': 'Crème corps',
  'creme-mains': 'Crème mains',
  'huile-corps': 'Huile corps',
  'gommage-corps': 'Gommage corps',
  'nettoyant-corps': 'Nettoyant corps',
  deodorant: 'Déodorant',
  'creme-pieds': 'Crème pieds',
  shampoing: 'Shampoing',
  'apres-shampoing': 'Après-shampoing',
  'masque-cheveux': 'Masque cheveux',
  'serum-cheveux': 'Sérum cheveux',
  'huile-cheveux': 'Huile cheveux',
  'produit-coiffant': 'Produit coiffant',
  dentifrice: 'Dentifrice',
  'bain-de-bouche': 'Bain de bouche',
  'blanchiment-dentaire': 'Blanchiment dentaire',
  'fil-dentaire': 'Fil dentaire',
  gelule: 'Gélule',
  capsule: 'Capsule',
  poudre: 'Poudre',
  sirop: 'Sirop',
  gummy: 'Gummy',
  patch: 'Patch',
  'outil-massage': 'Outil de massage',

  // Routine steps
  matin: 'Matin',
  soir: 'Soir',
  nettoyant: 'Nettoyant',
  'double-nettoyage-1': '1er nettoyage',
  'double-nettoyage-2': '2e nettoyage',
  preparation: 'Préparation',
  traitement: 'Traitement actif',
  hydratation: 'Hydratation',
  emollience: 'Émollience',
  'protection-solaire': 'Protection solaire',
  occlusion: 'Occlusion finale',
  'soin-yeux': 'Soin yeux',
  'soin-localise': 'Soin localisé',
  exfoliation: 'Exfoliation',
  'masque-hebdo': 'Masque hebdo',

  // Ingredient attributes
  'anti-oxydant': 'Anti-oxydant',
  humectant: 'Humectant',
  emollient: 'Émollient',
  reparateur: 'Réparateur',
  antiseptique: 'Antiseptique',
  keratolytique: 'Kératolytique',
  'sebo-regulateur': 'Sébo-régulateur',
  astringent: 'Astringent',
  'anti-bacterien': 'Anti-bactérien',
  biomimetique: 'Biomimétique',
  apaisant: 'Apaisant',
  prebiotique: 'Prébiotique',
  'anti-inflammatoire': 'Anti-inflammatoire',
  purifiant: 'Purifiant',
  'filtre-uv': 'Filtre UV',
  tensioactif: 'Tensioactif',
  excipient: 'Excipient',
  actif: 'Actif',

  // Skin effects
  occlusif: 'Occlusif',
  repulpant: 'Repulpant',
  matifiant: 'Matifiant',
  'texture-riche': 'Texture riche',
  'texture-legere': 'Texture légère',
  'protection-cutanee': 'Protection cutanée',

  // Product labels
  'sans-parfum': 'Sans parfum',
  'bio-naturel': 'Bio / Naturel',
  vegan: 'Vegan',
  'cruelty-free': 'Cruelty-free',
  hypoallergenique: 'Hypoallergénique',
  'pigments-verts': 'Pigments verts',
  'sans-savon': 'Sans savon',
  'filtres-chimiques': 'Filtres chimiques',
  'filtres-mineraux': 'Filtres minéraux',
  'grossesse-compatible': 'Grossesse compatible',

  // Shared labels
  comedogene: 'Comédogène',
  'non-comedogene': 'Non comédogène',

  // Supplement goals
  sommeil: 'Sommeil',
  energie: 'Énergie',
  cognition: 'Cognition',
  memoire: 'Mémoire',
  focus: 'Concentration',
  immunite: 'Immunité',
  longevite: 'Longévité',
  stress: 'Stress',
  anxiete: 'Anxiété',
  'sport-performance': 'Sport — performance',
  'sport-recuperation': 'Sport — récupération',
  articulations: 'Articulations',
  digestion: 'Digestion',
  cardiovasculaire: 'Cardiovasculaire',
  hormonal: 'Équilibre hormonal',
  os: 'Os',
  vision: 'Vision',
  detox: 'Détox',
  'peau-orale': 'Peau (voie orale)',
  'cheveux-orale': 'Cheveux (voie orale)',

  // Supplement moment
  // `matin` / `soir` labels already defined above (routine steps) — shared.
  'avec-repas': 'Avec repas',
  'a-jeun': 'À jeun',
  'pre-entrainement': 'Pré-entraînement',
  'post-entrainement': 'Post-entraînement',

  // Supplement restrictions
  'grossesse-incompatible': 'Contre-indiqué grossesse',
  'allaitement-incompatible': 'Contre-indiqué allaitement',
  'enfant-non-adapte': 'Non adapté enfant',
  'interaction-anticoagulants': 'Interaction anticoagulants',
  'insuffisance-hepatique': 'Insuffisance hépatique',
  'insuffisance-renale': 'Insuffisance rénale',

  // Supplement biochemical attributes
  antioxydant: 'Antioxydant',
  adaptogene: 'Adaptogène',
  nootrope: 'Nootrope',
  // `anti-inflammatoire` already defined above (skincare ingredient attribute).
  'immuno-modulateur': 'Immuno-modulateur',
  'precurseur-neurotransmetteur': 'Précurseur neurotransmetteur',
  'donneur-methyle': 'Donneur de méthyle',
  'cofacteur-enzymatique': 'Cofacteur enzymatique',
  stimulant: 'Stimulant',
  calmant: 'Calmant',

  // Dental concerns
  carie: 'Caries',
  'sensibilite-dentinaire': 'Sensibilité dentinaire',
  gencivite: 'Gingivite',
  parodontite: 'Parodontite',
  plaque: 'Plaque dentaire',
  tartre: 'Tartre',
  taches: 'Taches dentaires',
  'erosion-acide': 'Érosion acide',
  halitose: 'Mauvaise haleine',
  bruxisme: 'Bruxisme',
  aphtes: 'Aphtes',

  // Dental age groups
  adulte: 'Adulte',
  enfant: 'Enfant',
  senior: 'Senior',
  orthodontie: 'Orthodontie',
  implants: 'Implants',
  'dents-lait': 'Dents de lait',

  // Dental ingredient attributes
  remineralisant: 'Reminéralisant',
  antibacterien: 'Antibactérien',
  'anti-plaque': 'Anti-plaque',
  'anti-tartre': 'Anti-tartre',
  'abrasif-doux': 'Abrasif doux',
  'abrasif-fort': 'Abrasif fort',
  blanchissant: 'Blanchissant',
  'neutralisant-acide': 'Neutralisant acide',
  fluorure: 'Fluorure',
  desensibilisant: 'Désensibilisant',

  // Dental effects
  fraicheur: 'Fraîcheur',
  blancheur: 'Blancheur',
  'apaisement-gencives': 'Apaisement gencives',
  'renforcement-email': 'Renforcement émail',
  'reduction-sensibilite': 'Réduction sensibilité',

  // Dental product labels
  'sans-fluor': 'Sans fluor',
  'sans-alcool': 'Sans alcool',
  'sans-sls': 'Sans SLS',

  // Haircare concerns
  pellicules: 'Pellicules',
  chute: 'Chute de cheveux',
  casse: 'Casse',
  fourches: 'Fourches',
  frisottis: 'Frisottis',
  'manque-volume': 'Manque de volume',
  'cheveux-secs': 'Cheveux secs',
  'cheveux-gras': 'Cheveux gras',
  'cuir-chevelu-sensible': 'Cuir chevelu sensible',
  'cuir-chevelu-irrite': 'Cuir chevelu irrité',
  alopecie: 'Alopécie',
  'post-coloration': 'Post-coloration',
  'cheveux-ternes': 'Cheveux ternes',
  'jaunissement-blond': 'Jaunissement blond',
  'porosite-excessive': 'Porosité excessive',
  'pointes-seches': 'Pointes sèches',

  // Haircare hair types
  lisses: 'Cheveux lisses',
  ondules: 'Cheveux ondulés',
  boucles: 'Cheveux bouclés',
  crepus: 'Cheveux crépus',
  fins: 'Cheveux fins',
  epais: 'Cheveux épais',
  moyens: 'Cheveux moyens',
  colores: 'Cheveux colorés',
  decolores: 'Cheveux décolorés',
  naturels: 'Cheveux naturels',
  'cheveux-tous-types': 'Tous types de cheveux',

  // Haircare ingredient attributes
  proteine: 'Protéine',
  'film-protecteur': 'Film protecteur',
  'tensioactif-doux': 'Tensioactif doux',
  chelateur: 'Chélateur',
  'anti-pelliculaire': 'Anti-pelliculaire',
  'stimulant-follicule': 'Stimulant folliculaire',
  'conditionneur-cationique': 'Conditionneur cationique',
  gainant: 'Gainant',

  // Haircare effects
  douceur: 'Douceur',
  volume: 'Volume',
  discipline: 'Discipline',
  nutrition: 'Nutrition',
  lissant: 'Lissant',
  fixation: 'Fixation',
  'definition-boucles': 'Définition des boucles',
  gainage: 'Gainage',
}

function labelFor(slug: string): string {
  return TAG_LABELS[slug] ?? slug
}

// Seed rows consumed by createIngredientTag / createProductTag. Category
// (`tagType`) is derived from the shared taxonomy, so it cannot drift.
//
// Ingredient tag rows come from every domain taxonomy. De-dup by slug when
// the same slug exists in multiple taxonomies with the same category (e.g.
// `anti-inflammatoire` lives in both skincare and supplement ingredient
// attributes) — first occurrence wins, the assertion keeps the invariant.
const skincareIngredientTags = (
  Object.values(SKINCARE_INGREDIENT_TAG_SLUGS) as SkincareIngredientTagSlug[]
).map((slug) => ({
  slug,
  label: labelFor(slug),
  tagType: SKINCARE_INGREDIENT_TAG_TAXONOMY[slug].category as string,
}))

const supplementIngredientTags = (
  Object.values(SUPPLEMENT_INGREDIENT_TAG_SLUGS) as SupplementIngredientTagSlug[]
).map((slug) => ({
  slug,
  label: labelFor(slug),
  tagType: SUPPLEMENT_INGREDIENT_TAG_TAXONOMY[slug].category as string,
}))

const dentalIngredientTags = (
  Object.values(DENTAL_INGREDIENT_TAG_SLUGS) as DentalIngredientTagSlug[]
).map((slug) => ({
  slug,
  label: labelFor(slug),
  tagType: DENTAL_INGREDIENT_TAG_TAXONOMY[slug].category as string,
}))

const haircareIngredientTags = (
  Object.values(HAIRCARE_INGREDIENT_TAG_SLUGS) as HaircareIngredientTagSlug[]
).map((slug) => ({
  slug,
  label: labelFor(slug),
  tagType: HAIRCARE_INGREDIENT_TAG_TAXONOMY[slug].category as string,
}))

const seenIngredientSlugs = new Set<string>()
export const ingredientTagData = [
  ...skincareIngredientTags,
  ...supplementIngredientTags,
  ...dentalIngredientTags,
  ...haircareIngredientTags,
].filter((row) => {
  if (seenIngredientSlugs.has(row.slug)) return false
  seenIngredientSlugs.add(row.slug)
  return true
})

const skincareProductTags = (
  Object.values(SKINCARE_PRODUCT_TAG_SLUGS) as SkincareProductTagSlug[]
).map((slug) => ({
  slug,
  label: labelFor(slug),
  tagType: SKINCARE_PRODUCT_TAG_TAXONOMY[slug].category,
}))

const dentalProductTags = (Object.values(DENTAL_PRODUCT_TAG_SLUGS) as DentalProductTagSlug[]).map(
  (slug) => ({
    slug,
    label: labelFor(slug),
    tagType: DENTAL_PRODUCT_TAG_TAXONOMY[slug].category as string,
  })
)

const seenProductSlugs = new Set<string>()
export const productTagData = [...skincareProductTags, ...dentalProductTags].filter((row) => {
  if (seenProductSlugs.has(row.slug)) return false
  seenProductSlugs.add(row.slug)
  return true
})
