import clsx from 'clsx'
import type { ReactNode } from 'react'

import './FormMessage.css'

type FormMessageProps = {
  variant: 'error' | 'success' | 'warning'
  children: ReactNode
}

export function FormMessage({ variant, children }: FormMessageProps) {
  return (
    <div
      className={clsx('form-message', `form-message--${variant}`)}
      role={variant === 'success' ? 'status' : 'alert'}
    >
      {children}
    </div>
  )
}
