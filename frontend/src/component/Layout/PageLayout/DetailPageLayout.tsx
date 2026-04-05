import clsx from 'clsx'
import type { ReactNode } from 'react'
import './DetailPageLayout.css'

interface DetailPageLayoutProps {
  children: ReactNode
  banner?: boolean
  className?: string
  contentClassName?: string
}

export function DetailPageLayout({
  children,
  banner = false,
  className,
  contentClassName,
}: DetailPageLayoutProps) {
  return (
    <div className={clsx('detail-page-layout', className)}>
      {banner && <div className="detail-page-layout__banner" aria-hidden="true" />}
      <div
        className={clsx(
          'detail-page-layout__content',
          banner && 'detail-page-layout__content--with-banner',
          contentClassName
        )}
      >
        {children}
      </div>
    </div>
  )
}
