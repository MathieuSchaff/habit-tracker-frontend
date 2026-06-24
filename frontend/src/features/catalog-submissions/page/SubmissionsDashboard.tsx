import type { MySubmissionItem } from '@aurore/shared'

import { useSuspenseQuery } from '@tanstack/react-query'

import { ButtonLink } from '@/component/Button/Button'
import { Time } from '@/component/DataDisplay/Time/Time'
import { EmptyState } from '@/component/Feedback/ui/EmptyState/EmptyState'
import { SUBMISSION_STATE_LABELS } from '@/constants/catalog'
import { catalogSubmissionQueries } from '@/lib/queries/catalog-submissions'
import './submissions.css'

type SubmissionState = keyof typeof SUBMISSION_STATE_LABELS

function stateOf(
  item: Pick<MySubmissionItem, 'catalogQuality' | 'moderationStatus'>
): SubmissionState {
  if (item.moderationStatus === 'hidden') return 'hidden'
  if (item.catalogQuality === 'verified') return 'verified'
  return 'pending'
}

export function SubmissionsDashboard() {
  const { data } = useSuspenseQuery(catalogSubmissionQueries.mine())
  const items = data.items

  return (
    <section className="submissions">
      <header className="submissions__header">
        <h1 className="submissions__title">Mes soumissions</h1>
        <p className="submissions__lede">
          Les fiches que vous avez proposées au catalogue. Une fiche reste visible le temps qu’un
          modérateur la relise.
        </p>
      </header>

      {items.length === 0 ? (
        <EmptyState
          title="Aucune soumission"
          subtitle="Proposez un produit ou un ingrédient pour enrichir le catalogue."
        />
      ) : (
        <ul className="submissions__list">
          {items.map((item) => {
            const state = stateOf(item)
            return (
              <li key={`${item.kind}-${item.id}`} className="submissions__row">
                <div className="submissions__main">
                  <span className={`submissions__badge submissions__badge--${state}`}>
                    {SUBMISSION_STATE_LABELS[state]}
                  </span>
                  <strong className="submissions__name">{item.name}</strong>
                  {item.brand && <span className="submissions__brand"> · {item.brand}</span>}
                  <span className="submissions__meta">
                    {item.kind === 'product' ? 'Produit' : 'Ingrédient'} ·{' '}
                    <Time iso={item.createdAt} relative />
                  </span>
                </div>

                {state === 'hidden' && (
                  <div className="submissions__hidden">
                    {item.moderationReason && (
                      <p className="submissions__reason">
                        <span className="submissions__reason-label">Note du modérateur</span>
                        {item.moderationReason}
                      </p>
                    )}
                    <ButtonLink
                      to={item.kind === 'product' ? '/products/new' : '/ingredients/new'}
                      search={
                        item.kind === 'product'
                          ? { name: item.name, brand: item.brand ?? undefined }
                          : { name: item.name }
                      }
                      variant="outline"
                      size="sm"
                    >
                      Resoumettre
                    </ButtonLink>
                  </div>
                )}

                {state === 'pending' && (
                  <ButtonLink
                    to={
                      item.kind === 'product' ? '/products/$slug/edit' : '/ingredients/$slug/edit'
                    }
                    params={{ slug: item.slug }}
                    variant="ghost"
                    size="sm"
                  >
                    Modifier
                  </ButtonLink>
                )}
              </li>
            )
          })}
        </ul>
      )}
    </section>
  )
}
