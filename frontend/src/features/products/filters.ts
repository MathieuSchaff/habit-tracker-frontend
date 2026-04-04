import type { FilterSubGroup } from '@/component/Filter/types'

export type FilterKey =
  | 'brand'
  | 'concern'
  | 'skin_type'
  | 'skin_zone'
  | 'product_type'
  | 'routine_step'
  | 'attribute'
  | 'ingredient'

export const FILTER_KEYS = [
  'brand',
  'concern',
  'skin_type',
  'skin_zone',
  'product_type',
  'routine_step',
  'attribute',
  'ingredient',
] as const satisfies readonly FilterKey[]

export const GROUP_LABELS: Record<FilterKey, string> = {
  skin_type: 'Peau',
  skin_zone: 'Zone',
  concern: 'Objectif',
  product_type: 'Type',
  routine_step: 'Étape',
  attribute: 'Préf.',
  brand: 'Marque',
  ingredient: 'Ingr.',
}

export const TAG_CATEGORY_TO_KEY: Record<string, FilterKey> = {
  routine_step: 'routine_step',
  attribute: 'attribute',
  skin_type: 'skin_type',
  skin_zone: 'skin_zone',
  product_type: 'product_type',
  concern: 'concern',
}

export const LABEL_OVERRIDES: Record<string, string> = {
  humectant: 'Hydratant',
  emollient: 'Nourrissant',
  'sebo-regulateur': 'Anti-sébum',
  'barriere-alteree': 'Peau sensibilisée',
}

export const ATTRIBUTE_SUBGROUPS: FilterSubGroup[] = [
  {
    label: 'Formulation',
    slugs: [
      'bio-naturel',
      'vegan',
      'cruelty-free',
      'sans-parfum',
      'sans-savon',
      'hypoallergenique',
      'non-comedogene',
      'grossesse-compatible',
    ],
    maxVisible: 6,
  },
  {
    label: 'Texture',
    slugs: ['texture-legere', 'texture-riche'],
  },
  {
    label: 'Action',
    slugs: [
      'apaisant',
      'humectant',
      'anti-oxydant',
      'matifiant',
      'sebo-regulateur',
      'reparateur',
      'protection-cutanee',
      'prebiotique',
    ],
    maxVisible: 6,
  },
  {
    label: 'Technique',
    slugs: [
      'keratolytique',
      'astringent',
      'antiseptique',
      'anti-bacterien',
      'biomimetique',
      'emollient',
      'barriere-alteree',
      'filtres-chimiques',
      'filtres-mineraux',
      'pigments-verts',
      'comedogene',
    ],
    maxVisible: 4,
  },
]
