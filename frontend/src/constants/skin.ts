import type { SkinConcern, SkinType } from '@habit-tracker/shared'

export const SKIN_TYPE_LABELS: Record<SkinType, string> = {
  'peau-seche': 'Sèche',
  'peau-mixte': 'Mixte',
  'peau-grasse': 'Grasse',
  'peau-reactive': 'Réactive',
  'peau-normale': 'Normale',
  'peau-atopique': 'Atopique',
  'peau-rugueuse': 'Rugueuse',
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
  microbiome: 'Microbiome',
  'photo-vieillissement': 'Photo-vieillissement',
  'teint-terne': 'Teint terne',
  repulpant: 'Repulpant',
  eczema: 'Eczéma',
  'grain-peau': 'Grain de peau',
  'keratose-pilaire': 'Kératose pilaire',
}

export const FITZPATRICK_ITEMS = [
  { value: 1, label: 'I', description: 'Toujours brûle, jamais bronze' },
  { value: 2, label: 'II', description: 'Brûle facilement, bronze peu' },
  { value: 3, label: 'III', description: 'Brûle modérément, bronze' },
  { value: 4, label: 'IV', description: 'Brûle peu, bronze bien' },
  { value: 5, label: 'V', description: 'Brûle rarement' },
  { value: 6, label: 'VI', description: 'Ne brûle jamais' },
] as const
