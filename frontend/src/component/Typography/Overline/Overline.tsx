import clsx from 'clsx'
import type { ReactNode } from 'react'
import './Overline.css'

type OverlineProps = {
  children: ReactNode
  className?: string
  decorative?: boolean
}

export function Overline({ children, className, decorative = false }: OverlineProps) {
  return (
    <span className={clsx('overline', className)} aria-hidden={decorative || undefined}>
      {children}
    </span>
  )
}
