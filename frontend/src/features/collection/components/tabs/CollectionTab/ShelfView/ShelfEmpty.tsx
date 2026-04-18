import type { UserProductStatus } from '@habit-tracker/shared'

import { statusLabels } from '@/features/collection/constants'

import './ShelfEmpty.css'

const EMOJIS: Record<UserProductStatus, string> = {
  holy_grail: '💎',
  in_stock: '🪞',
  wishlist: '✨',
  watched: '👀',
  archived: '🗂️',
  avoided: '🚫',
}

const TITLES: Record<UserProductStatus, string> = {
  holy_grail: 'Pas encore de Saint Graal',
  in_stock: 'Rien en stock',
  wishlist: 'Wishlist vide',
  watched: 'Rien en surveillance',
  archived: 'Rien d’archivé',
  avoided: 'Rien à éviter',
}

const HINTS: Record<UserProductStatus, string> = {
  holy_grail: 'Marquez un produit comme Saint Graal pour le voir ici.',
  in_stock: 'Ajoutez votre premier produit pour commencer.',
  wishlist: 'Notez les produits qui vous tentent en Wishlist.',
  watched: 'Surveillez un produit pour suivre ses avis.',
  archived: 'Les produits finis apparaîtront ici.',
  avoided: 'Les produits qui n’ont pas fonctionné viendront ici.',
}

interface ShelfEmptyProps {
  status: UserProductStatus
}

export function ShelfEmpty({ status }: ShelfEmptyProps) {
  const cfg = statusLabels[status]
  return (
    <div className="shelf-empty">
      <div className="shelf-empty-emoji" aria-hidden="true">
        {EMOJIS[status]}
      </div>
      <h3 className="shelf-empty-title">{TITLES[status]}</h3>
      <p className="shelf-empty-hint">{HINTS[status]}</p>
      <span className="sr-only">Étagère « {cfg.label} » vide.</span>
    </div>
  )
}
