import type { UserProductStatus } from '@habit-tracker/shared'

import { statusLabels } from '@/features/collection/constants'

import './ShelfEmpty.css'

// Virtual tabs (holy_grail, repurchase) filter on fields other than status —
// handle their empty states alongside the real statuses here so ShelfView only
// needs one empty component.
export type ShelfEmptyKind = UserProductStatus | 'holy_grail' | 'repurchase'

const EMOJIS: Record<ShelfEmptyKind, string> = {
  in_stock: '🪞',
  wishlist: '✨',
  watched: '👀',
  archived: '🗂️',
  avoided: '🚫',
  holy_grail: '💎',
  repurchase: '🔁',
}

const TITLES: Record<ShelfEmptyKind, string> = {
  in_stock: 'Rien en stock',
  wishlist: 'Wishlist vide',
  watched: 'Rien sous le coude',
  archived: 'Rien d’archivé',
  avoided: 'Rien à éviter',
  holy_grail: 'Pas encore de Saint Graal',
  repurchase: 'Rien à racheter',
}

const HINTS: Record<ShelfEmptyKind, string> = {
  in_stock: 'Ajoutez votre premier produit pour commencer.',
  wishlist: 'Notez les produits qui vous tentent en Wishlist.',
  watched: 'Gardez un œil sur un produit avant de vous décider.',
  archived: 'Les produits finis apparaîtront ici.',
  avoided: 'Les produits qui n’ont pas fonctionné viendront ici.',
  holy_grail:
    'Marquez un produit avec le ressenti 💎 pour le retrouver ici, peu importe sa place sur l’étagère.',
  repurchase:
    'Marquez « Je rachèterais » sur un produit pour le retrouver ici quand il sera temps.',
}

const FALLBACK_LABEL: Record<ShelfEmptyKind, string> = {
  in_stock: 'En stock',
  wishlist: 'Wishlist',
  watched: 'Garde un œil',
  archived: 'Archivé',
  avoided: 'À éviter',
  holy_grail: 'Saint Graal',
  repurchase: 'À racheter',
}

interface ShelfEmptyProps {
  status: ShelfEmptyKind
}

export function ShelfEmpty({ status }: ShelfEmptyProps) {
  const label =
    status === 'holy_grail' || status === 'repurchase'
      ? FALLBACK_LABEL[status]
      : (statusLabels[status]?.label ?? FALLBACK_LABEL[status])
  return (
    <div className="shelf-empty">
      <div className="shelf-empty-emoji" aria-hidden="true">
        {EMOJIS[status]}
      </div>
      <h3 className="shelf-empty-title">{TITLES[status]}</h3>
      <p className="shelf-empty-hint">{HINTS[status]}</p>
      <span className="sr-only">Étagère « {label} » vide.</span>
    </div>
  )
}
