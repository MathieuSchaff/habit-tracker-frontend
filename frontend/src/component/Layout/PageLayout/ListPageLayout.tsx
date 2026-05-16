import clsx from 'clsx'
import type { CSSProperties, ReactNode } from 'react'

import './ListPageLayout.css'

interface ListPageLayoutProps {
  children: ReactNode
  className?: string
}

function ListPageLayout({ children, className }: ListPageLayoutProps) {
  return <div className={clsx('list-page-layout', className)}>{children}</div>
}

interface HeaderProps {
  title?: string
  meta?: ReactNode
  actions?: ReactNode
  isLoading?: boolean
  transparent?: boolean
  centered?: boolean
  /** Renders children directly and escapes root padding. */
  fullBleed?: boolean
  children?: ReactNode
  className?: string
}

function Header({
  title,
  meta,
  actions,
  isLoading,
  transparent,
  centered,
  fullBleed,
  children,
  className,
}: HeaderProps) {
  return (
    <div
      className={clsx(
        'list-page-layout__header',
        transparent && 'list-page-layout__header--transparent',
        centered && 'list-page-layout__header--centered',
        fullBleed && 'list-page-layout__header--full-bleed',
        className
      )}
    >
      {fullBleed ? (
        children
      ) : (
        <>
          <div className="list-page-layout__header-info">
            <h2 className="list-page-layout__title">
              {title}
              <span
                className={clsx(
                  'list-page-layout__loader',
                  isLoading && 'list-page-layout__loader--visible'
                )}
                aria-hidden="true"
              />
              {isLoading && <span className="sr-only">Chargement en cours</span>}
            </h2>
            {meta && <div className="list-page-layout__meta">{meta}</div>}
          </div>
          {actions && <div className="list-page-layout__actions">{actions}</div>}
        </>
      )}
    </div>
  )
}

interface BodyProps {
  children: ReactNode
  maxWidth?: string
  isSyncing?: boolean
  className?: string
}

function Body({ children, maxWidth, isSyncing, className }: BodyProps) {
  return (
    <div
      className={clsx(
        'list-page-layout__body',
        isSyncing && 'list-page-layout__body--syncing',
        className
      )}
      style={maxWidth ? ({ '--_body-max-width': maxWidth } as CSSProperties) : undefined}
    >
      {children}
    </div>
  )
}

ListPageLayout.Header = Header
ListPageLayout.Body = Body

export { ListPageLayout }
