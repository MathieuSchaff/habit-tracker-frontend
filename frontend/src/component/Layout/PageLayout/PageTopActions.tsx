import clsx from 'clsx'
import type { ReactNode } from 'react'
import './PageTopActions.css'

interface PageTopActionsProps {
  children: ReactNode
  className?: string
}

export function PageTopActions({ children, className }: PageTopActionsProps) {
  return <div className={clsx('page-top-actions', className)}>{children}</div>
}

export function PageTopActionsRight({ children, className }: PageTopActionsProps) {
  return <div className={clsx('page-top-actions__right', className)}>{children}</div>
}
