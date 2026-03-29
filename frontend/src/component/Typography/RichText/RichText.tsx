import clsx from 'clsx'
import type { ReactNode } from 'react'
import './RichText.css'

interface RichTextProps {
  children?: ReactNode
  className?: string
}

export function RichText({ children, className }: RichTextProps) {
  return <div className={clsx('rich-text', className)}>{children}</div>
}
