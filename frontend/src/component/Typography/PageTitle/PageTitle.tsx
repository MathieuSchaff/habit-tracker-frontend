import clsx from 'clsx'
import type { ReactNode } from 'react'
import './PageTitle.css'

export interface PageTitleProps {
  title: ReactNode
  subtitle?: ReactNode
  count?: number | string
  isLoading?: boolean
  className?: string
  children?: ReactNode
}

export function PageTitle({
  title,
  subtitle,
  count,
  isLoading,
  className,
  children,
}: PageTitleProps) {
  return (
    <div className={clsx('page-title-container', className)}>
      <div className="page-title__content">
        <div className="page-title__heading-wrapper">
          <h1 className="page-title__text">
            {title}
            {count !== undefined && <span className="page-title__count">{count}</span>}
            {isLoading && <span className="page-title__loader">...</span>}
          </h1>
        </div>
        {subtitle && <p className="page-title__subtitle">{subtitle}</p>}
      </div>
      {children && <div className="page-title__actions">{children}</div>}
    </div>
  )
}
