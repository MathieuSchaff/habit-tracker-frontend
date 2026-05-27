import { HelpCircle } from 'lucide-react'
import { useState } from 'react'

import { criteriaDefinitions, criteriaLabels } from '@/features/collection/constants'
import { useUpsertUserProductReview } from '@/lib/queries/user-products'

import './CriteriaList.css'

interface CriteriaListProps {
  userProductId: string
  review: Record<string, unknown> | undefined | null
}

export function CriteriaList({ userProductId, review }: CriteriaListProps) {
  const upsertReview = useUpsertUserProductReview()
  const [activeTooltip, setActiveTooltip] = useState<string | null>(null)

  const handleRate = (key: string, val: number) => {
    const current = review?.[key]
    const newVal = current === val ? null : val
    upsertReview.mutate({ id: userProductId, input: { [key]: newVal } })
  }

  return (
    <div className="pds-criteria-list">
      {Object.entries(criteriaLabels).map(([key, label]) => (
        <div key={key} className="pds-criterion">
          <div className="pds-criterion-info">
            <span className="pds-criterion-label">{label}</span>
            <div className="pds-tooltip-container">
              <button
                type="button"
                className="pds-help-btn"
                onMouseEnter={() => setActiveTooltip(key)}
                onMouseLeave={() => setActiveTooltip(null)}
                onFocus={() => setActiveTooltip(key)}
                onBlur={() => setActiveTooltip(null)}
                onClick={() => setActiveTooltip(activeTooltip === key ? null : key)}
                aria-label={`Aide pour ${label}`}
                aria-describedby={activeTooltip === key ? `pds-tooltip-${key}` : undefined}
              >
                <HelpCircle size={12} aria-hidden="true" />
              </button>
              {activeTooltip === key && (
                <div className="pds-tooltip" role="tooltip" id={`pds-tooltip-${key}`}>
                  {criteriaDefinitions[key as keyof typeof criteriaDefinitions]}
                </div>
              )}
            </div>
          </div>
          <div className="pds-stars">
            {[1, 2, 3, 4, 5].map((star) => {
              const current = (review?.[key] as number | null | undefined) ?? 0
              const isFilled = current >= star
              return (
                <button
                  key={star}
                  type="button"
                  className={`pds-star ${isFilled ? 'filled' : ''}`}
                  onClick={() => handleRate(key, star)}
                  aria-label={`Noter ${label} ${star} sur 5`}
                  aria-pressed={current === star}
                />
              )
            })}
          </div>
        </div>
      ))}
    </div>
  )
}
