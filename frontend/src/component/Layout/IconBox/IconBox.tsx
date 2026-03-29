import clsx from 'clsx'
import type { ReactNode } from 'react'
import './IconBox.css'

interface IconBoxProps {
  children: ReactNode
  className?: string
}

export function IconBox({ children, className }: IconBoxProps) {
  return <div className={clsx('icon-box', className)}>{children}</div>
}
