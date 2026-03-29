import type { UserProductStatus } from '@habit-tracker/shared'

import { Archive, Ban, Eye, Heart, type LucideIcon, Package, ShoppingBag } from 'lucide-react'

import type { ReviewCriteria } from '@/lib/helpers/reviews'

export const statusLabels: Record<
  UserProductStatus,
  { label: string; icon: LucideIcon; color: string }
> = {
  in_stock: { label: 'En stock', icon: Package, color: 'var(--status-color-in-stock)' },
  wishlist: { label: 'Wishlist', icon: ShoppingBag, color: 'var(--status-color-wishlist)' },
  watched: { label: 'Surveille', icon: Eye, color: 'var(--status-color-watched)' },
  holy_grail: { label: 'Saint Graal', icon: Heart, color: 'var(--status-color-holy-grail)' },
  archived: { label: 'Archivé', icon: Archive, color: 'var(--status-color-archived)' },
  avoided: { label: 'À éviter', icon: Ban, color: 'var(--status-color-avoided)' },
}

export const SHELF_ORDER: UserProductStatus[] = [
  'holy_grail',
  'in_stock',
  'wishlist',
  'watched',
  'archived',
  'avoided',
]

export const kindColorTokens: Record<string, string> = {
  skincare: 'var(--shelf-color-skincare)',
  complément: 'var(--shelf-color-complement)',
  complement: 'var(--shelf-color-complement)',
  huile: 'var(--shelf-color-huile)',
  vitamine: 'var(--shelf-color-vitamine)',
}

export const DEFAULT_KIND_COLOR_TOKEN = 'var(--shelf-color-default)'

export { sentimentEmojis } from '@/utils/sentimentMap'

export const criteriaLabels: Record<keyof ReviewCriteria, string> = {
  tolerance: 'Tolérance',
  efficacy: 'Efficacité',
  sensoriality: 'Sensorialité',
  stability: 'Stabilité',
  mixability: 'Mixabilité',
  valueForMoney: 'Rapport Q/P',
}

export const criteriaDefinitions: Record<keyof ReviewCriteria, string> = {
  tolerance:
    'Réaction de la peau (rougeurs, picotements, boutons). Le produit respecte-t-il votre barrière cutanée ?',
  efficacy: 'Le produit tient-il ses promesses (hydratation, éclat, anti-imperfections, etc.) ?',
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
  note: 'Note',
  sentiment: 'Ressenti',
  date: 'Date',
  price_asc: 'Prix ↑',
  price_desc: 'Prix ↓',
}
