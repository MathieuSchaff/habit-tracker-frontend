import type {
  PreferencesTag,
  RessentiTag,
  RoutineTag,
  UserProductStatus,
} from '@habit-tracker/shared'

import { Archive, Ban, Eye, type LucideIcon, Package, ShoppingBag } from 'lucide-react'

import type { ReviewCriteria } from '@/lib/helpers/reviews'

export const statusLabels: Record<
  UserProductStatus,
  { label: string; icon: LucideIcon; color: string; purpose: string }
> = {
  in_stock: {
    label: 'En stock',
    icon: Package,
    color: 'var(--status-color-in-stock)',
    purpose: 'Produit en votre possession, prêt à être utilisé.',
  },
  wishlist: {
    label: 'Wishlist',
    icon: ShoppingBag,
    color: 'var(--status-color-wishlist)',
    purpose: 'Pas encore acheté — vous avez l’intention de l’acheter.',
  },
  watched: {
    label: 'Garde un œil',
    icon: Eye,
    color: 'var(--status-color-watched)',
    purpose:
      'Bookmark sans engagement — vous gardez ce produit en mémoire sans l’ajouter à votre routine ni à votre wishlist.',
  },
  archived: {
    label: 'Archivé',
    icon: Archive,
    color: 'var(--status-color-archived)',
    purpose: 'Produit passé — fini, plus en stock, ou mis de côté longuement.',
  },
  avoided: {
    label: 'À éviter',
    icon: Ban,
    color: 'var(--status-color-avoided)',
    purpose: 'Vous avez rejeté ce produit pour vous.',
  },
}

// Holy Grail is sentiment=6, not a status — orthogonal to these tabs.
export const PRIMARY_SHELF_ORDER: UserProductStatus[] = ['in_stock', 'wishlist', 'watched']

// Past products and rejects live in the "Plus" overflow.
export const SECONDARY_SHELF_ORDER: UserProductStatus[] = ['archived', 'avoided']

// "Tout" excludes archived + avoided so the default view stays calm.
export const ALL_TAB_STATUSES: UserProductStatus[] = [...PRIMARY_SHELF_ORDER]

export const SHELF_ORDER: UserProductStatus[] = [...PRIMARY_SHELF_ORDER, ...SECONDARY_SHELF_ORDER]

export const criteriaLabels: Record<keyof ReviewCriteria, string> = {
  tolerance: 'Tolérance',
  efficacy: 'Efficacité',
  sensoriality: 'Sensorialité',
  stability: 'Stabilité',
  mixability: 'Mixabilité',
  valueForMoney: 'Rapport Q/P',
}

export const criteriaDefinitions: Record<keyof ReviewCriteria, string> = {
  tolerance: 'Comment votre peau a réagi à ce produit, dans votre routine.',
  efficacy: "Ce que vous avez constaté pendant la durée d'utilisation.",
  sensoriality:
    "Confort, texture, odeur et plaisir à l'application. Un produit peut être efficace mais désagréable à utiliser !",
  stability:
    "Le produit s'altère-t-il avec le temps (oxydation, changement d'odeur ou de couleur) ?",
  mixability: 'Se superpose-t-il bien avec d\'autres soins (sans pelucher/faire de "pilling") ?',
  valueForMoney: 'Le prix est-il justifié par les résultats et la durée de vie du flacon ?',
}

export type SortOption = 'name' | 'note' | 'sentiment' | 'date' | 'price_asc' | 'price_desc'

export const sortOptions: SortOption[] = [
  'name',
  'note',
  'sentiment',
  'date',
  'price_asc',
  'price_desc',
]

export const sortLabels: Record<SortOption, string> = {
  name: 'Nom',
  note: 'Évaluation',
  sentiment: 'Ressenti',
  date: 'Date',
  price_asc: 'Prix ↑',
  price_desc: 'Prix ↓',
}

// Card chip color thresholds (score out of 20).
export const SCORE_THRESHOLDS = {
  gold: 17,
  rare: 14,
  good: 10,
} as const

// FR labels for user-experience tags (PDS §5).
export const ressentiLabels: Record<RessentiTag, string> = {
  leger: 'Léger',
  riche: 'Riche',
  collant: 'Collant',
  confortable: 'Confortable',
  dessechant: 'Desséchant',
  picotements: 'Picotements',
  'aucun-souci': 'Aucun souci',
  incertain: 'Incertain',
}

export const routineLabels: Record<RoutineTag, string> = {
  matin: 'Matin',
  soir: 'Soir',
  'sous-maquillage': 'Sous le maquillage',
  'apres-exfoliation': 'Après exfoliation',
  voyage: 'Voyage',
  hiver: 'Hiver',
  ete: 'Été',
}

export const preferencesLabels: Record<PreferencesTag, string> = {
  'sans-parfum': 'Je préfère sans parfum',
  'eviter-pour-moi': 'À éviter pour moi',
  'a-comparer': 'À comparer',
  'a-reessayer': 'À réessayer',
}
