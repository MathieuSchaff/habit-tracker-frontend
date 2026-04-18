import type { UserProductStatus } from '@habit-tracker/shared'

import clsx from 'clsx'
import { Check } from 'lucide-react'
import type { CSSProperties } from 'react'

import { DropdownMenu } from '@/component/DropdownMenu/DropdownMenu'
import { SHELF_ORDER, statusLabels } from '@/features/collection/constants'

import './StatusPicker.css'

interface StatusPickerProps {
  current?: UserProductStatus | null
  title?: string
  onPick: (status: UserProductStatus) => void
}

export function StatusPicker({ current, title = 'Déplacer vers…', onPick }: StatusPickerProps) {
  return (
    <div className="status-picker">
      <div className="status-picker-title">{title}</div>
      <div className="status-picker-grid">
        {SHELF_ORDER.map((s, idx) => {
          const cfg = statusLabels[s]
          const Icon = cfg.icon
          const active = s === current
          return (
            <DropdownMenu.Item key={s} index={idx} onSelect={() => onPick(s)}>
              <button
                type="button"
                className={clsx('status-option', active && 'active')}
                style={
                  {
                    '--opt-color': cfg.color,
                    '--opt-bg': `color-mix(in oklch, ${cfg.color} 12%, transparent)`,
                  } as CSSProperties
                }
              >
                <span className="status-option-dot">
                  <Icon size={13} aria-hidden="true" />
                </span>
                <span className="status-option-label">{cfg.label}</span>
                {active && (
                  <span className="status-option-check" aria-hidden="true">
                    <Check size={14} />
                  </span>
                )}
              </button>
            </DropdownMenu.Item>
          )
        })}
      </div>
    </div>
  )
}
