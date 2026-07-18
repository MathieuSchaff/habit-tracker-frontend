import clsx from 'clsx'
import type { ComponentProps } from 'react'
import './CardTitle.css'

export function CardTitle({ className, ...props }: ComponentProps<'h2'>) {
  return <h2 className={clsx('card-title', className)} {...props} />
}
