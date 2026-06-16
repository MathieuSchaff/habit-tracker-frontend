import { useQuery } from '@tanstack/react-query'
import { ArrowRight } from 'lucide-react'

import { Time } from '@/component/DataDisplay/Time/Time'
import { statusLabels } from '@/features/collection/constants'
import { userProductQueries } from '@/lib/queries/user-products'

import './StatusHistory.css'

interface StatusHistoryProps {
  userProductId: string
}

export function StatusHistory({ userProductId }: StatusHistoryProps) {
  const { data, isLoading, isError } = useQuery({
    ...userProductQueries.history(userProductId),
    staleTime: 30_000,
  })

  return (
    <details className="pds-history-disclosure">
      <summary className="pds-history-summary">
        Historique des décisions
        {data && data.length > 0 && <span className="pds-history-count">{data.length}</span>}
      </summary>
      <div className="pds-history-body">
        {isLoading && <p className="pds-empty-msg">Chargement…</p>}
        {isError && (
          <p className="pds-empty-msg" role="alert">
            Historique indisponible — réessayez plus tard.
          </p>
        )}
        {data && data.length === 0 && (
          <p className="pds-empty-msg">Aucune transition enregistrée pour le moment.</p>
        )}
        {data && data.length > 0 && (
          <ol className="pds-history-list">
            {data.map((entry) => {
              const to = statusLabels[entry.toStatus]
              const from = entry.fromStatus ? statusLabels[entry.fromStatus] : null
              return (
                <li key={entry.id} className="pds-history-item">
                  <div className="pds-history-row">
                    <Time iso={entry.createdAt} style="long" className="pds-history-date" />
                    <span className="pds-history-transition">
                      {from ? (
                        <>
                          <span style={{ color: from.color }}>{from.label}</span>
                          <ArrowRight size={12} aria-hidden="true" />
                        </>
                      ) : (
                        <span className="pds-history-from-empty">Ajout</span>
                      )}
                      <span style={{ color: to.color }}>{to.label}</span>
                    </span>
                  </div>
                  {entry.reason && (
                    <p className="pds-history-reason">
                      <span className="pds-history-reason-label">Raison</span>
                      {entry.reason}
                    </p>
                  )}
                </li>
              )
            })}
          </ol>
        )}
      </div>
    </details>
  )
}
