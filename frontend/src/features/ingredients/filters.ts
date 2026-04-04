import type { FilterSubGroup } from '@/component/Filter/types'

export type FilterKey = 'category' | 'concern' | 'skin_type' | 'attribute'

export const FILTER_KEYS = [
  'category',
  'concern',
  'skin_type',
  'attribute',
] as const satisfies readonly FilterKey[]

export const GROUP_LABELS: Record<FilterKey, string> = {
  skin_type: 'Peau',
  concern: 'Problème',
  attribute: 'Propriété',
  category: 'Catégorie',
}

export const ATTRIBUTE_SUBGROUPS: FilterSubGroup[] = [
  {
    label: 'Actions',
    slugs: [
      'apaisant',
      'humectant',
      'anti-oxydant',
      'emollient',
      'occlusif',
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
      'filtres-chimiques',
      'filtres-mineraux',
      'pigments-verts',
      'comedogene',
    ],
    maxVisible: 4,
  },
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
      'texture-legere',
      'texture-riche',
      'barriere-cutanee-alteree',
    ],
    maxVisible: 6,
  },
]
