import clsx from 'clsx'
import type { ReactNode } from 'react'

import './SettingsSection.css'

type SettingsSectionProps = {
  title?: string
  description?: string
  variant?: 'default' | 'danger'
  compact?: boolean
  children: ReactNode
  className?: string
}

export function SettingsSection({
  title,
  description,
  variant = 'default',
  compact = false,
  children,
  className,
}: SettingsSectionProps) {
  return (
    <section
      className={clsx(
        'settings-section',
        variant === 'danger' && 'settings-section--danger',
        compact && 'settings-section--compact',
        className
      )}
    >
      {title && <h3 className="settings-section__title">{title}</h3>}
      {description && <p className="settings-section__desc">{description}</p>}
      {children}
    </section>
  )
}
