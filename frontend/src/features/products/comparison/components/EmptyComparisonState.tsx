type Props = { count: number }

export function EmptyComparisonState({ count }: Props) {
  if (count >= 2) return null
  return (
    <section>
      <h2>Sélectionne au moins 2 produits</h2>
      <p>
        {count === 0
          ? 'Recherche un produit ci-dessus pour commencer.'
          : 'Ajoute au moins un produit supplémentaire pour comparer.'}
      </p>
    </section>
  )
}
