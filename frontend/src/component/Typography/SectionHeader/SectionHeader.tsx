import clsx from 'clsx'
import type { ReactNode } from 'react'
import './SectionHeader.css'

type HeadingLevel = 'h2' | 'h3' | 'h4'

interface SectionHeaderProps {
  title: string
  count?: number | string
  /** Screen reader label for the count (default: "éléments") */
  countLabel?: string
  as?: HeadingLevel
  variant?: 'default' | 'primary' | 'error'
  className?: string
  children?: ReactNode
}

export function SectionHeader({
  title,
  count,
  countLabel = 'éléments',
  as: Tag = 'h2',
  variant = 'default',
  className,
  children,
}: SectionHeaderProps) {
  return (
    <div className={clsx('section-header', `section-header--${variant}`, className)}>
      <Tag className="section-header__title">
        {title}
        {count !== undefined && (
          <span className="section-header__count" aria-hidden="true">
            {count}
          </span>
        )}
        {count !== undefined && (
          <span className="sr-only">
            {count} {countLabel}
          </span>
        )}
      </Tag>
      {children && <div className="section-header__actions">{children}</div>}
    </div>
  )
}
