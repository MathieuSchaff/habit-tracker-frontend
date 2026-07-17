import { Check } from 'lucide-react'

import { Button } from '@/component/Button/Button'
import './EmptyComparisonState.css'

type Props = { count: number; onSave?: () => void; isPending?: boolean }

export function EmptyComparisonState({ count, onSave, isPending }: Props) {
  const ready = count >= 2

  return (
    <div className="empty-comparison">
      <div className="empty-comparison__steps" aria-hidden>
        <div
          className={`empty-comparison__step${count >= 1 ? ' empty-comparison__step--done' : ' empty-comparison__step--active'}`}
        >
          1
        </div>
        <div
          className={`empty-comparison__step-line${count >= 1 ? ' empty-comparison__step-line--done' : ''}`}
        />
        <div
          className={`empty-comparison__step${count >= 2 ? ' empty-comparison__step--done' : count === 1 ? ' empty-comparison__step--active' : ''}`}
        >
          2
        </div>
        <div className="empty-comparison__step-line" />
        <div className="empty-comparison__step">…</div>
      </div>

      <p className="empty-comparison__title">
        {ready
          ? 'Prêt à comparer'
          : count === 0
            ? 'Sélectionne au moins 2 produits'
            : "Plus qu'un produit à ajouter"}
      </p>
      <p className="empty-comparison__desc">
        {ready
          ? 'Enregistre pour voir la comparaison côte à côte.'
          : count === 0
            ? 'Recherche un produit ci-dessus pour commencer.'
            : 'Ajoute au moins un produit supplémentaire pour comparer.'}
      </p>
      {ready && onSave && (
        <Button
          variant="primary"
          className="empty-comparison__cta"
          onClick={onSave}
          loading={isPending}
        >
          <Check size={16} />
          Enregistrer la comparaison
        </Button>
      )}
      <p className="empty-comparison__foot">de 2 à 8 produits · aucun classement, aucune note</p>
    </div>
  )
}
