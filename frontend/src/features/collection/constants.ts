import type { UserProductStatus } from '@habit-tracker/shared'

import { Archive, Ban, Eye, Heart, Package, ShoppingBag, type LucideIcon } from 'lucide-react'
import type { ReviewCriteria } from '../../lib/helpers/reviews'

export type SortOption = 'name' | 'note' | 'sentiment' | 'date' | 'price_asc' | 'price_desc'

export const statusLabels: Record<UserProductStatus, { label: string; icon: LucideIcon; color: string }> = {
  in_stock: { label: 'En stock', icon: Package, color: '#10b981' },
  wishlist: { label: 'Wishlist', icon: ShoppingBag, color: '#3b82f6' },
  watched: { label: 'Surveille', icon: Eye, color: '#f59e0b' },
  holy_grail: { label: 'Saint Graal', icon: Heart, color: '#ef4444' },
  archived: { label: 'Archivé', icon: Archive, color: '#6b7280' },
  avoided: { label: 'À éviter', icon: Ban, color: '#000000' },
}

export const sentimentEmojis: Record<number, string> = { 1: '🤢', 2: '👎', 3: '😐', 4: '👍', 5: '😍' }

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

export const sortOptions: SortOption[] = ['name', 'note', 'sentiment', 'date', 'price_asc', 'price_desc']
export const sortLabels: Record<SortOption, string> = {
  name: 'Nom',
  note: 'Note',
  sentiment: 'Ressenti',
  date: 'Date',
  price_asc: 'Prix ↑',
  price_desc: 'Prix ↓',
}
