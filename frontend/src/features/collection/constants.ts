/**
 * Constantes de la feature Collection.
 *
 * Source de vérité unique pour les labels, icônes et couleurs
 * liés aux statuts, sentiments et critères d'évaluation.
 */

import type { UserProductStatus } from '@habit-tracker/shared'

import { Archive, Ban, Eye, Heart, type LucideIcon, Package, ShoppingBag } from 'lucide-react'

import type { ReviewCriteria } from '../../lib/helpers/reviews'

/* ────────────────────────────────────────────
   Statuts produit — label, icône et couleur
   ──────────────────────────────────────────── */

export const statusLabels: Record<
  UserProductStatus,
  { label: string; icon: LucideIcon; color: string }
> = {
  in_stock: { label: 'En stock', icon: Package, color: '#10b981' },
  wishlist: { label: 'Wishlist', icon: ShoppingBag, color: '#3b82f6' },
  watched: { label: 'Surveille', icon: Eye, color: '#f59e0b' },
  holy_grail: { label: 'Saint Graal', icon: Heart, color: '#ef4444' },
  archived: { label: 'Archivé', icon: Archive, color: '#6b7280' },
  avoided: { label: 'À éviter', icon: Ban, color: '#000000' },
}

/** Ordre d'affichage des étagères dans la ShelfView */
export const SHELF_ORDER: UserProductStatus[] = [
  'holy_grail',
  'in_stock',
  'wishlist',
  'watched',
  'archived',
  'avoided',
]

/** Maps product kind to its CSS custom property for the shelf card color */
export const kindColorTokens: Record<string, string> = {
  skincare: 'var(--shelf-color-skincare)',
  complément: 'var(--shelf-color-complement)',
  complement: 'var(--shelf-color-complement)',
  huile: 'var(--shelf-color-huile)',
  vitamine: 'var(--shelf-color-vitamine)',
}

export const DEFAULT_KIND_COLOR_TOKEN = 'var(--shelf-color-default)'

/* ────────────────────────────────────────────
   Sentiments — mapping note (1-5) → emoji
   Réexporté depuis le module utilitaire partagé.
   ──────────────────────────────────────────── */

export { sentimentEmojis } from '../../utils/sentimentMap'

/* ────────────────────────────────────────────
   Critères d'évaluation — labels et définitions
   ──────────────────────────────────────────── */

/** Libellés courts affichés à côté des étoiles */
export const criteriaLabels: Record<keyof ReviewCriteria, string> = {
  tolerance: 'Tolérance',
  efficacy: 'Efficacité',
  sensoriality: 'Sensorialité',
  stability: 'Stabilité',
  mixability: 'Mixabilité',
  valueForMoney: 'Rapport Q/P',
}

/** Définitions détaillées affichées dans les infobulles */
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

/* ────────────────────────────────────────────
   Options de tri
   ──────────────────────────────────────────── */

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
