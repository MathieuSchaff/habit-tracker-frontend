import { useSuspenseQuery } from '@tanstack/react-query'
import { Link } from '@tanstack/react-router'

import { Button } from '@/component/Button'
import { comparisonQueries, useDeleteComparison } from '@/lib/queries/comparisons'

export function ComparisonsListPage() {
  const { data: comparisons } = useSuspenseQuery(comparisonQueries.list())
  const del = useDeleteComparison()

  return (
    <section>
      <header>
        <h1>Mes comparaisons</h1>
        <Link to="/products/compare/new">
          <Button>Nouvelle comparaison</Button>
        </Link>
      </header>
      <ul>
        {comparisons.map((c) => (
          <li key={c.id}>
            <Link to="/products/compare/$id" params={{ id: c.id }}>
              {c.name ?? 'Sans nom'} — {c.productCount} produits
            </Link>
            <Button onClick={() => del.mutate(c.id)} variant="ghost">
              Supprimer
            </Button>
          </li>
        ))}
      </ul>
    </section>
  )
}
