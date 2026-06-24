import { type ReactNode, useEffect } from 'react'

import { useAnnounce } from '@/hooks/useAnnounce'
import './EmptyState.css'

interface EmptyStateProps {
  icon?: ReactNode
  title?: string
  subtitle?: string
  children?: ReactNode
}

export function EmptyState({ icon, title, subtitle, children }: EmptyStateProps) {
  const announce = useAnnounce()
  // EmptyState mounts at the list→empty swap, so a self-contained role="status" would be born
  // with its content — not reliably announced. Push the message to the app-level persistent
  // region (always mounted) instead, which mutates an existing node and is announced reliably.
  const message = [title, subtitle].filter(Boolean).join('. ')
  useEffect(() => {
    if (message) announce(message)
  }, [message, announce])

  return (
    <div className="empty-state">
      {icon && <div className="empty-state__icon">{icon}</div>}
      {title && <h2 className="empty-state__title">{title}</h2>}
      {subtitle && <p className="empty-state__subtitle">{subtitle}</p>}
      {children}
    </div>
  )
}
