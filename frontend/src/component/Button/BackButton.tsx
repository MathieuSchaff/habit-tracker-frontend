import type { LinkProps } from '@tanstack/react-router'
import { ArrowLeft } from 'lucide-react'
import type { ReactNode } from 'react'

import { Button, ButtonLink } from './Button'

type BackButtonProps = {
  children?: ReactNode
  className?: string
} & (
  | { to: LinkProps['to']; params?: LinkProps['params']; search?: LinkProps['search'] }
  | { onClick?: () => void }
)

export function BackButton(props: BackButtonProps) {
  const { children, className } = props

  if ('to' in props) {
    return (
      <ButtonLink
        to={props.to}
        params={props.params}
        search={props.search}
        variant="ghost"
        size="sm"
        className={className}
      >
        <ArrowLeft size={16} />
        {children}
      </ButtonLink>
    )
  }

  return (
    <Button onClick={props.onClick} variant="ghost" size="sm" className={className}>
      <ArrowLeft size={16} />
      {children}
    </Button>
  )
}
