import type { ReactNode } from 'react'
import './EmptyState.css'

interface EmptyStateProps {
  icon?: ReactNode
  title?: string
  subtitle?: string
  children?: ReactNode
}

export function EmptyState({ icon, title, subtitle, children }: EmptyStateProps) {
  return (
    <div className="empty-state">
      {icon && <div className="empty-state__icon">{icon}</div>}
      {title && <h2 className="empty-state__title">{title}</h2>}
      {subtitle && <p className="empty-state__subtitle">{subtitle}</p>}
      {children}
    </div>
  )
}
