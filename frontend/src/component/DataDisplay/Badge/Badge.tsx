import clsx from 'clsx'
import type { ReactNode } from 'react'
import './Badge.css'

export type BadgeVariant =
  | 'default'
  | 'primary'
  | 'skincare'
  | 'huile'
  | 'vitamine'
  | 'complement'
  | 'error'

interface BadgeProps {
  children: ReactNode
  variant?: BadgeVariant
  className?: string
  rounded?: boolean
}

export function Badge({ children, variant = 'default', className, rounded = true }: BadgeProps) {
  return (
    <span className={clsx('badge', `badge--${variant}`, rounded && 'badge--rounded', className)}>
      {children}
    </span>
  )
}
