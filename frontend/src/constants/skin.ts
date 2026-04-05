import type { SkinConcern, SkinType } from '@habit-tracker/shared'

export const SKIN_TYPE_LABELS: Record<SkinType, string> = {
  dry: 'Sèche',
  oily: 'Grasse',
  combination: 'Mixte',
  normal: 'Normale',
  sensitive: 'Sensible',
}

export const SKIN_CONCERN_LABELS: Record<SkinConcern, string> = {
  acne: 'Acné',
  blackheads: 'Points noirs',
  enlarged_pores: 'Pores dilatés',
  hyperpigmentation: 'Hyperpigmentation',
  dark_spots: 'Taches brunes',
  uneven_skin_tone: 'Teint irrégulier',
  dullness: 'Teint terne',
  dehydration: 'Déshydratation',
  fine_lines: 'Ridules',
  wrinkles: 'Rides',
  loss_of_firmness: 'Perte de fermeté',
  dark_circles: 'Cernes',
  puffiness: 'Gonflement',
  rosacea: 'Rosacée',
  atopic_dermatitis: 'Dermatite atopique',
  perioral_dermatitis: 'Dermatite périorale',
  seborrheic_dermatitis: 'Dermatite séborrhéique',
  eczema: 'Eczéma',
  psoriasis: 'Psoriasis',
  acne_vulgaris: 'Acné vulgaire',
  acne_cystic: 'Acné kystique',
  keratosis_pilaris: 'Kératose pilaire',
  vitiligo: 'Vitiligo',
  melasma: 'Mélasma',
  contact_dermatitis: 'Dermatite de contact',
  couperose: 'Couperose',
}

export const FITZPATRICK_ITEMS = [
  { value: 1, label: 'I', description: 'Toujours brûle, jamais bronze' },
  { value: 2, label: 'II', description: 'Brûle facilement, bronze peu' },
  { value: 3, label: 'III', description: 'Brûle modérément, bronze' },
  { value: 4, label: 'IV', description: 'Brûle peu, bronze bien' },
  { value: 5, label: 'V', description: 'Brûle rarement' },
  { value: 6, label: 'VI', description: 'Ne brûle jamais' },
] as const
