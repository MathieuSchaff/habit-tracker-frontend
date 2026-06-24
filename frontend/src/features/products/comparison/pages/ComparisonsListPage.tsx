import { useSuspenseQuery } from '@tanstack/react-query'
import { Link } from '@tanstack/react-router'

import { Button, ButtonLink } from '@/component/Button/Button'
import { Time } from '@/component/DataDisplay/Time/Time'
import { useConfirm } from '@/features/admin/useConfirm'
import { comparisonQueries, useDeleteComparison } from '@/lib/queries/comparisons'
import './ComparisonsListPage.css'

export function ComparisonsListPage() {
  const { data: comparisons } = useSuspenseQuery(comparisonQueries.list())
  const del = useDeleteComparison()
  const { confirm, dialog } = useConfirm()

  return (
    <section className="comparisons-list-page">
      <header className="comparisons-list-page__header">
        <h1 className="comparisons-list-page__title">Mes comparaisons</h1>
        <ButtonLink to="/products/compare/new">Nouvelle comparaison</ButtonLink>
      </header>

      {comparisons.length === 0 ? (
        <div className="comparisons-list-page__empty">
          <p className="comparisons-list-page__empty-title">Aucune comparaison</p>
          <p className="comparisons-list-page__empty-desc">
            Crée ta première comparaison pour analyser des produits côte à côte.
          </p>
        </div>
      ) : (
        <ul className="comparisons-list-page__grid">
          {comparisons.map((c) => (
            <li key={c.id} className="comparison-card">
              <Link
                to="/products/compare/$id"
                params={{ id: c.id }}
                className="comparison-card__link"
              >
                <p
                  className={`comparison-card__name${!c.name ? ' comparison-card__name--unnamed' : ''}`}
                >
                  {c.name ?? 'Sans nom'}
                </p>
                <div className="comparison-card__meta">
                  <span className="comparison-card__count-badge">
                    {c.productCount} produit{c.productCount > 1 ? 's' : ''}
                  </span>
                  <Time iso={c.createdAt} style="medium" className="comparison-card__date" />
                </div>
              </Link>
              <div className="comparison-card__footer">
                <Button
                  onClick={async () => {
                    if (
                      await confirm({
                        title: `Supprimer la comparaison « ${c.name ?? 'Sans nom'} » ?`,
                        confirmLabel: 'Supprimer',
                        variant: 'danger',
                      })
                    ) {
                      del.mutate(c.id)
                    }
                  }}
                  variant="ghost"
                  size="sm"
                >
                  Supprimer
                </Button>
              </div>
            </li>
          ))}
        </ul>
      )}
      {dialog}
    </section>
  )
}
