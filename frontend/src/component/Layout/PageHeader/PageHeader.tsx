import clsx from 'clsx'
import type { CSSProperties, ReactNode } from 'react'
import './PageHeader.css'

interface PageHeaderProps {
  title: string
  meta?: string | number | ReactNode
  actions?: ReactNode
  isLoading?: boolean
  /** Cap header content to the page rail so title/actions align with the body. */
  maxWidth?: string
  className?: string
  actionsClassName?: string
}

export function PageHeader({
  title,
  meta,
  actions,
  isLoading,
  maxWidth,
  className,
  actionsClassName,
}: PageHeaderProps) {
  return (
    <div
      className={clsx('page-header', className)}
      style={maxWidth ? ({ '--_header-max-width': maxWidth } as CSSProperties) : undefined}
      aria-busy={isLoading || undefined}
    >
      <div className="page-header__info">
        <h1 className="page-header__title">
          {title}
          <span
            className={clsx('page-header__loader', isLoading && 'page-header__loader--visible')}
            aria-hidden="true"
          />
          {isLoading && <span className="sr-only">Chargement en cours</span>}
        </h1>
        {meta !== undefined && meta !== null && meta !== false && (
          <div className="page-header__meta">{meta}</div>
        )}
      </div>
      {actions && <div className={clsx('page-header__actions', actionsClassName)}>{actions}</div>}
    </div>
  )
}
