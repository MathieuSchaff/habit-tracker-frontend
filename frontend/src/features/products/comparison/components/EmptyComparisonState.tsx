import './EmptyComparisonState.css'

type Props = { count: number }

export function EmptyComparisonState({ count }: Props) {
  if (count >= 2) return null

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
        {count === 0 ? 'Sélectionne au moins 2 produits' : "Plus qu'un produit à ajouter"}
      </p>
      <p className="empty-comparison__desc">
        {count === 0
          ? 'Recherche un produit ci-dessus pour commencer.'
          : 'Ajoute au moins un produit supplémentaire pour comparer.'}
      </p>
    </div>
  )
}
