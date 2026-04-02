import clsx from 'clsx'
import type { ReactNode } from 'react'
import './PageHeader.css'

interface PageHeaderProps {
  title: string
  meta?: string | number | ReactNode
  actions?: ReactNode
  isLoading?: boolean
  className?: string
  actionsClassName?: string
}

export function PageHeader({
  title,
  meta,
  actions,
  isLoading,
  className,
  actionsClassName,
}: PageHeaderProps) {
  return (
    <div className={clsx('page-header', className)}>
      <div className="page-header__info">
        <h2 className="page-header__title">
          {title}
          {isLoading && <span className="page-header__loader" aria-hidden="true" />}
        </h2>
        {meta && <div className="page-header__meta">{meta}</div>}
      </div>
      {actions && <div className={clsx('page-header__actions', actionsClassName)}>{actions}</div>}
    </div>
  )
}
