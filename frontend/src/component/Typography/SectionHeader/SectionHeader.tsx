import clsx from 'clsx'
import type { ReactNode } from 'react'
import './SectionHeader.css'

interface SectionHeaderProps {
  title: string
  count?: number | string
  variant?: 'default' | 'primary' | 'error'
  className?: string
  children?: ReactNode
}

export function SectionHeader({
  title,
  count,
  variant = 'default',
  className,
  children,
}: SectionHeaderProps) {
  return (
    <div className={clsx('section-header', `section-header--${variant}`, className)}>
      <h2 className="section-header__title">
        {title}
        {count !== undefined && <span className="section-header__count">{count}</span>}
      </h2>
      {children && <div className="section-header__actions">{children}</div>}
    </div>
  )
}
