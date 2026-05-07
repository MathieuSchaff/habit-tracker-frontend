import type { UserProductStatus } from '@habit-tracker/shared'

import clsx from 'clsx'

import { statusLabels } from '@/features/collection/constants'

interface StatusSelectorProps {
  value: UserProductStatus
  onChange: (status: UserProductStatus) => void
  spaced?: boolean
}

export function StatusSelector({ value, onChange, spaced = false }: StatusSelectorProps) {
  return (
    <div className={clsx('qa-status-grid', spaced && 'qa-status-grid--spaced')}>
      {(Object.keys(statusLabels) as UserProductStatus[]).map((s) => {
        const cfg = statusLabels[s]
        const Icon = cfg.icon
        return (
          <button
            key={s}
            type="button"
            className={clsx('qa-status-opt', value === s && 'active')}
            onClick={() => onChange(s)}
            aria-pressed={value === s}
          >
            <Icon size={18} aria-hidden="true" />
            <span>{cfg.label}</span>
          </button>
        )
      })}
    </div>
  )
}
