import type { UserProductStatus } from '@aurore/shared'

import clsx from 'clsx'

import { SentimentIcon } from '@/assets/sentiment-icons'
import { pdsLabels } from '@/features/collection/constants'

type SentimentValue = 1 | 2 | 3 | 4 | 5 | 6

interface SentimentPickerProps {
  value: number | null | undefined
  onChange: (value: SentimentValue) => void
  // Holy Grail (6) hidden on rejected products - would contradict the rejection.
  status?: UserProductStatus
}

const STANDARD_VALUES = [1, 2, 3, 4, 5] as const

export function SentimentPicker({ value, onChange, status }: SentimentPickerProps) {
  const holyGrailAllowed = status !== 'avoided'

  return (
    <fieldset className="pds-sentiment-row" aria-label={pdsLabels.sentimentQuick}>
      {STANDARD_VALUES.map((val) => (
        <button
          key={val}
          type="button"
          className={clsx('pds-sentiment-btn', value === val && 'active')}
          aria-label={`Ressenti ${val} sur 5`}
          aria-pressed={value === val}
          onClick={() => onChange(val)}
        >
          <span className="pds-emoji">
            <SentimentIcon value={val} size={24} />
          </span>
        </button>
      ))}
      {holyGrailAllowed && (
        <button
          type="button"
          className={clsx('pds-sentiment-btn pds-sentiment-btn--grail', value === 6 && 'active')}
          aria-label="Saint Graal"
          aria-pressed={value === 6}
          onClick={() => onChange(6)}
        >
          <span className="pds-emoji">
            <SentimentIcon value={6} size={24} />
          </span>
        </button>
      )}
    </fieldset>
  )
}
