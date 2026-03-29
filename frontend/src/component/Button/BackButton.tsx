import type { LinkProps } from '@tanstack/react-router'
import { ArrowLeft } from 'lucide-react'
import type { ReactNode } from 'react'

import { PillButton } from './PillButton'

type BackButtonProps = {
  children?: ReactNode
  className?: string
} & (
  | { to: string; params?: LinkProps['params']; search?: LinkProps['search'] }
  | { onClick?: () => void }
)

export function BackButton(props: BackButtonProps) {
  const { children, className } = props

  const pillProps =
    'to' in props
      ? { to: props.to, params: props.params, search: props.search }
      : { onClick: props.onClick }

  return (
    <PillButton {...pillProps} className={className}>
      <ArrowLeft size={16} />
      {children}
    </PillButton>
  )
}
