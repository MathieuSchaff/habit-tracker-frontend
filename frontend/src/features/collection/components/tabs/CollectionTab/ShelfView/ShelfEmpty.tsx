import type { UserProductStatus } from '@aurore/shared'

import { EmptyIllustration } from '@/assets/empty-icons'
import { statusLabels } from '@/features/collection/constants'

import './ShelfEmpty.css'

// Virtual tabs share this empty component so ShelfView only needs one.
type ShelfEmptyKind = UserProductStatus | 'holy_grail' | 'repurchase'

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
    'Marquez un produit avec le ressenti « Saint Graal » pour le retrouver ici, peu importe sa place sur l’étagère.',
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
    <div className="shelf-empty" data-kind={status}>
      <div className="shelf-empty-art" aria-hidden="true">
        <EmptyIllustration kind={status} size={96} />
      </div>
      <h3 className="shelf-empty-title">{TITLES[status]}</h3>
      <p className="shelf-empty-hint">{HINTS[status]}</p>
      <span className="sr-only">Étagère « {label} » vide.</span>
    </div>
  )
}
