import type { FeedOrder, PostTone, SimilarityBand, SkinConcern, SkinType } from '@aurore/shared'

export const SKIN_TYPE_LABELS: Record<SkinType, string> = {
  'peau-seche': 'Sèche',
  'peau-mixte': 'Mixte',
  'peau-grasse': 'Grasse',
  'peau-normale': 'Normale',
  'peau-sensible': 'Sensible',
}

export const SKIN_CONCERN_LABELS: Record<SkinConcern, string> = {
  'anti-rougeurs': 'Rougeurs',
  rosacee: 'Rosacée',
  couperose: 'Couperose',
  flushs: 'Flushs',
  'barriere-cutanee': 'Barrière cutanée fragilisée',
  'anti-taches': 'Taches',
  'anti-acne': 'Acné',
  'anti-age': 'Anti-âge',
  hyperpigmentation: 'Hyperpigmentation',
  deshydratation: 'Déshydratation',
  'pores-dilates': 'Pores dilatés',
  'cernes-poches': 'Cernes et poches',
  brillance: 'Brillance',
  eclat: 'Éclat',
  'post-acne': 'Marques post-acné',
  cicatrisation: 'Cicatrisation',
  'photo-vieillissement': 'Photo-vieillissement',
  'teint-terne': 'Teint terne',
  repulpant: 'Repulpant',
  eczema: 'Eczéma',
  'grain-peau': 'Grain de peau',
  'keratose-pilaire': 'Kératose pilaire',
}

// Ordinal similarity bands surfaced as calm labels. 'eloigne' is never shown
// (the engine excludes it from every surface), so it carries no label.
export const SIMILARITY_BAND_LABELS: Partial<Record<SimilarityBand, string>> = {
  'tres-proche': 'Très proche',
  proche: 'Proche',
}

// Post tone is a facet, not an object: a calm label, never a counter or score.
export const POST_TONE_LABELS: Record<PostTone, string> = {
  principal: 'Principal',
  'coup-de-gueule': 'Coup de gueule',
}

// Feed ordering: by recency or by closeness — never by reactions/popularity (#3).
export const FEED_ORDER_LABELS: Record<FeedOrder, string> = {
  recency: 'Récent',
  similarity: 'Affinité',
}

export const FITZPATRICK_ITEMS = [
  { value: 1, label: 'I', description: 'Toujours brûle, jamais bronze' },
  { value: 2, label: 'II', description: 'Brûle facilement, bronze peu' },
  { value: 3, label: 'III', description: 'Brûle modérément, bronze' },
  { value: 4, label: 'IV', description: 'Brûle peu, bronze bien' },
  { value: 5, label: 'V', description: 'Brûle rarement' },
  { value: 6, label: 'VI', description: 'Ne brûle jamais' },
] as const
