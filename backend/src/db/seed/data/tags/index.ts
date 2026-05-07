import {
  DENTAL_INGREDIENT_TAG_SLUGS,
  DENTAL_INGREDIENT_TAG_TAXONOMY,
  DENTAL_PRODUCT_TAG_SLUGS,
  DENTAL_PRODUCT_TAG_TAXONOMY,
  type DentalIngredientTagSlug,
  type DentalProductTagSlug,
  getProductTagLabel,
  HAIRCARE_INGREDIENT_TAG_SLUGS,
  HAIRCARE_INGREDIENT_TAG_TAXONOMY,
  HAIRCARE_PRODUCT_TAG_SLUGS,
  HAIRCARE_PRODUCT_TAG_TAXONOMY,
  type HaircareIngredientTagSlug,
  type HaircareProductTagSlug,
  SKINCARE_INGREDIENT_TAG_SLUGS,
  SKINCARE_INGREDIENT_TAG_TAXONOMY,
  SKINCARE_PRODUCT_TAG_SLUGS,
  SKINCARE_PRODUCT_TAG_TAXONOMY,
  type SkincareIngredientTagSlug,
  type SkincareProductTagSlug,
  SUPPLEMENT_INGREDIENT_TAG_SLUGS,
  SUPPLEMENT_INGREDIENT_TAG_TAXONOMY,
  SUPPLEMENT_PRODUCT_TAG_SLUGS,
  SUPPLEMENT_PRODUCT_TAG_TAXONOMY,
  type SupplementIngredientTagSlug,
  type SupplementProductTagSlug,
} from '@habit-tracker/shared'

// Re-export the haircare product slug map directly. It cannot be folded into
// the legacy `TAG_SLUGS` alias below: keys `BRILLANCE` and `HYDRATATION` exist
// in both skincare and haircare product taxonomies with different slug values
// (`brillance` / `brillance-cheveux`, `hydratation` / `hydratation-cheveux`),
// so spreading would silently rewrite skincare seeds that reference those keys.
export { HAIRCARE_PRODUCT_TAG_SLUGS } from '@habit-tracker/shared'

// Combined legacy alias — still consumed by other seed modules that have not
// been migrated to the split slug maps yet.
export const TAG_SLUGS = {
  ...SKINCARE_INGREDIENT_TAG_SLUGS,
  ...SKINCARE_PRODUCT_TAG_SLUGS,
  ...SUPPLEMENT_INGREDIENT_TAG_SLUGS,
  ...DENTAL_INGREDIENT_TAG_SLUGS,
  ...HAIRCARE_INGREDIENT_TAG_SLUGS,
  // Product-side dental slugs (DENTIFRICE, BAIN_DE_BOUCHE, FIL_DENTAIRE, etc.)
  // spread after skincare so dental seed files that reference
  // `TAG_SLUGS.DENTIFRICE` keep resolving (same slug value, now owned by dental
  // instead of the removed skincare legacy keys).
  ...DENTAL_PRODUCT_TAG_SLUGS,
  // Same migration for supplement product_type slugs (GELULE, CAPSULE, POUDRE,
  // SIROP, GUMMY) — removed from skincare, ownership moved to supplement so
  // nutripure/etc. seeds that use `TAG_SLUGS.GELULE` still resolve.
  ...SUPPLEMENT_PRODUCT_TAG_SLUGS,
} as const
export type TagSlug = (typeof TAG_SLUGS)[keyof typeof TAG_SLUGS]

// Ingredient-only labels (slug → FR display name). Product tag labels now
// live in the shared product taxonomies and are resolved via
// `getProductTagLabel`. Shared concern/skin_type/etc slugs that happen to
// also be ingredient slugs stay defined here; the cross-entity duplication
// (e.g. `anti-rougeurs` for both an ingredient row and a product row) is
// expected — DB rows are independent.
const INGREDIENT_TAG_LABELS: Record<string, string> = {
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
  'peau-sensible': 'Peau sensible',
  'peau-normale': 'Peau normale',

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
  carie: 'Carie',
  'sensibilite-dentinaire': 'Sensibilité dentinaire',
  gencivite: 'Gingivite',
  parodontite: 'Parodontite',
  plaque: 'Plaque',
  tartre: 'Tartre',
  taches: 'Taches',
  'erosion-acide': 'Érosion acide',
  halitose: 'Halitose',
  bruxisme: 'Bruxisme',
  aphtes: 'Aphtes',

  // Dental age group
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
  // `anti-inflammatoire` already defined above.

  // Dental effects
  fraicheur: 'Fraîcheur',
  blancheur: 'Blancheur',
  'apaisement-gencives': 'Apaisement gencives',
  'renforcement-email': 'Renforcement de l’émail',
  'reduction-sensibilite': 'Réduction de la sensibilité',

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

  // Hair types
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

  // Haircare effects (brillance + hydratation already defined upstream) ─
  douceur: 'Douceur',
  volume: 'Volume',
  discipline: 'Discipline',
  nutrition: 'Nutrition',
  lissant: 'Lissant',
  fixation: 'Fixation',
  'definition-boucles': 'Définition boucles',
  gainage: 'Gainage',

  // Haircare product concerns (extra)
  'racines-grasses': 'Racines grasses',

  // Haircare product types
  shampooing: 'Shampooing',
  'shampooing-sec': 'Shampooing sec',
  'shampooing-clarifiant': 'Shampooing clarifiant',
  'co-wash': 'Co-wash',
  'apres-shampooing': 'Après-shampooing',
  'masque-capillaire': 'Masque capillaire',
  'soin-profond': 'Soin profond',
  'serum-capillaire': 'Sérum capillaire',
  'huile-capillaire': 'Huile capillaire',
  'leave-in': 'Leave-in',
  'lotion-fortifiante': 'Lotion fortifiante',
  'gel-coiffant': 'Gel coiffant',
  'mousse-coiffante': 'Mousse coiffante',
  'creme-coiffante': 'Crème coiffante',
  'spray-coiffant': 'Spray coiffant',
  'spray-thermoprotecteur': 'Spray thermoprotecteur',
  'cire-coiffante': 'Cire coiffante',

  // Haircare routine steps
  'pre-shampooing': 'Pré-shampooing',
  lavage: 'Lavage',
  conditionnement: 'Conditionnement',
  'masque-hebdo-cheveux': 'Masque hebdo cheveux',
  'traitement-cuir-chevelu': 'Traitement cuir chevelu',
  'soin-sans-rincage': 'Soin sans rinçage',
  coiffage: 'Coiffage',
  finition: 'Finition',

  // Haircare product-specific effects
  // -cheveux suffix disambiguates from skincare slugs (brillance/concern,
  // hydratation/routine_step). Same display text intentionally.
  'brillance-cheveux': 'Brillance',
  'hydratation-cheveux': 'Hydratation',
  'anti-frisottis': 'Anti-frisottis',
  demelage: 'Démêlage',
  reparation: 'Réparation',
  thermoprotection: 'Thermoprotection',

  // Haircare product labels (extra)
  'sans-sulfates': 'Sans sulfates',
  'sans-silicones': 'Sans silicones',
  'cgm-friendly': 'Curly Girl Method',

  // Dental product concerns (extra)
  'email-affaibli': 'Émail affaibli',
  'secheresse-buccale': 'Sécheresse buccale',

  // Dental age group (extra)
  ado: 'Ado',

  // Dental product types (extra)
  brossette: 'Brossette',
  'kit-blanchiment': 'Kit blanchiment',

  // Dental effects (extra)
  remineralisation: 'Reminéralisation',

  // Dental product labels
  'sans-fluor': 'Sans fluor',
  'sans-sls': 'Sans SLS',
  'sans-edulcorants-artificiels': 'Sans édulcorants artificiels',
  bio: 'Bio',

  // Supplement product goals (extra)
  // sommeil/energie/cognition/immunite/digestion/longevite/hormonal déjà
  // définis côté ingredient, réutilisés via labelFor.
  'peau-cheveux-ongles': 'Peau, cheveux, ongles',
  'stress-anxiete': 'Stress & anxiété',
  'recuperation-musculaire': 'Récupération musculaire',

  // Supplement moment (extra)
  // `matin-supplement` / `soir-supplement` gardent l'affichage 'Matin' / 'Soir'
  // (distinction seulement côté slug DB pour lever la collision avec skincare
  // routine_step.matin / routine_step.soir — même pattern que haircare
  // brillance-cheveux / hydratation-cheveux).
  'matin-supplement': 'Matin',
  'soir-supplement': 'Soir',
  'autour-sport': 'Autour du sport',

  // Supplement restriction (extra)
  'interaction-thyroide': 'Interaction thyroïde',

  // Supplement product types (extra)
  // gelule/capsule/poudre/sirop/gummy déjà définis (déplacés de skincare).
  comprime: 'Comprimé',
  'ampoule-buvable': 'Ampoule buvable',
  'huile-orale': 'Huile orale',
  'spray-sublingual': 'Spray sublingual',

  // Supplement product labels (extra)
  'sans-gluten': 'Sans gluten',
  'sans-lactose': 'Sans lactose',
  'fabrication-fr': 'Fabrication française',
  'extrait-titre': 'Extrait titré',
  'dose-clinique': 'Dose clinique',

  // Skincare actif class (pharmacological clusters)
  retinoids: 'Rétinoïdes',
  'retinol-alternatives': 'Alternatives au rétinol',
  'vitamin-c': 'Vitamine C',
  'vitamin-e': 'Vitamine E',
  niacinamide: 'Niacinamide',
  aha: 'AHA',
  bha: 'BHA',
  pha: 'PHA',
  'enzymes-exfoliants': 'Enzymes exfoliantes',
  ceramides: 'Céramides',
  'hyaluronic-acid': 'Acide hyaluronique',
  peptides: 'Peptides',
  polyphenols: 'Polyphénols',
  centella: 'Centella asiatica',
  'tyrosinase-inhibitors': 'Inhibiteurs de tyrosinase',
  'azelaic-acid': 'Acide azélaïque',
}

function labelForIngredient(slug: string): string {
  return INGREDIENT_TAG_LABELS[slug] ?? slug
}

function labelForProduct(slug: string): string {
  return getProductTagLabel(slug) ?? slug
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
  label: labelForIngredient(slug),
  tagType: SKINCARE_INGREDIENT_TAG_TAXONOMY[slug].category as string,
}))

const supplementIngredientTags = (
  Object.values(SUPPLEMENT_INGREDIENT_TAG_SLUGS) as SupplementIngredientTagSlug[]
).map((slug) => ({
  slug,
  label: labelForIngredient(slug),
  tagType: SUPPLEMENT_INGREDIENT_TAG_TAXONOMY[slug].category as string,
}))

const dentalIngredientTags = (
  Object.values(DENTAL_INGREDIENT_TAG_SLUGS) as DentalIngredientTagSlug[]
).map((slug) => ({
  slug,
  label: labelForIngredient(slug),
  tagType: DENTAL_INGREDIENT_TAG_TAXONOMY[slug].category as string,
}))

const haircareIngredientTags = (
  Object.values(HAIRCARE_INGREDIENT_TAG_SLUGS) as HaircareIngredientTagSlug[]
).map((slug) => ({
  slug,
  label: labelForIngredient(slug),
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
  label: labelForProduct(slug),
  tagType: SKINCARE_PRODUCT_TAG_TAXONOMY[slug].category as string,
}))

const haircareProductTags = (
  Object.values(HAIRCARE_PRODUCT_TAG_SLUGS) as HaircareProductTagSlug[]
).map((slug) => ({
  slug,
  label: labelForProduct(slug),
  tagType: HAIRCARE_PRODUCT_TAG_TAXONOMY[slug].category as string,
}))

const dentalProductTags = (Object.values(DENTAL_PRODUCT_TAG_SLUGS) as DentalProductTagSlug[]).map(
  (slug) => ({
    slug,
    label: labelForProduct(slug),
    tagType: DENTAL_PRODUCT_TAG_TAXONOMY[slug].category as string,
  })
)

const supplementProductTags = (
  Object.values(SUPPLEMENT_PRODUCT_TAG_SLUGS) as SupplementProductTagSlug[]
).map((slug) => ({
  slug,
  label: labelForProduct(slug),
  tagType: SUPPLEMENT_PRODUCT_TAG_TAXONOMY[slug].category as string,
}))

// Same de-dup pattern as ingredientTagData: first-wins on shared slugs
// (e.g. `sans-parfum`, `vegan` — same tagType `product_label` across domains).
const seenProductSlugs = new Set<string>()
export const productTagData = [
  ...skincareProductTags,
  ...haircareProductTags,
  ...dentalProductTags,
  ...supplementProductTags,
].filter((row) => {
  if (seenProductSlugs.has(row.slug)) return false
  seenProductSlugs.add(row.slug)
  return true
})
