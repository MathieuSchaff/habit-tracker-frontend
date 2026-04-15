import { Link, type LinkProps } from '@tanstack/react-router'
import clsx from 'clsx'
import type { ReactNode } from 'react'

import { Spinner } from '../Feedback/Spinner/Spinner'

type BaseProps = {
  variant?: 'primary' | 'secondary' | 'outline' | 'ghost' | 'accent' | 'default' | 'danger-ghost'
  size?: 'sm' | 'md' | 'lg'
  loading?: boolean
  fullWidth?: boolean
  children: ReactNode
  className?: string
}

type ButtonAsButtonProps = BaseProps & {
  type?: 'button' | 'submit' | 'reset'
  onClick?: () => void
  disabled?: boolean
} & Omit<React.ComponentProps<'button'>, 'type' | 'onClick' | 'disabled' | 'children'>

type ButtonAsLinkProps = BaseProps & {
  to: string
  params?: LinkProps['params']
  search?: LinkProps['search']
}

type ButtonProps = (ButtonAsButtonProps | ButtonAsLinkProps) & {
  asLink?: boolean
}

export const Button = (props: ButtonProps) => {
  const {
    variant = 'primary',
    size = 'md',
    loading = false,
    fullWidth = false,
    children,
    className,
  } = props

  const classes = clsx(
    'button',
    variant,
    size,
    fullWidth && 'full-width',
    loading && 'loading',
    className
  )

  const content = (
    <>
      {loading && <Spinner />}
      {!loading && children}
    </>
  )

  if ('to' in props) {
    const {
      to,
      params,
      search,
      variant: _,
      size: _s,
      loading: _l,
      fullWidth: _fw,
      className: _cn,
      children: _ch,
      ...linkRest
    } = props as ButtonAsLinkProps

    return (
      <Link
        to={to as never}
        params={params}
        search={search}
        className={classes}
        aria-busy={loading || undefined}
        aria-disabled={loading || undefined}
        {...linkRest}
      >
        {content}
      </Link>
    )
  }

  const {
    type = 'button',
    onClick,
    disabled,
    variant: _,
    size: _s,
    loading: _l,
    fullWidth: _fw,
    className: _cn,
    children: _ch,
    asLink: _al,
    ...buttonRest
  } = props as ButtonAsButtonProps & { asLink?: boolean }

  return (
    <button
      type={type}
      onClick={onClick}
      className={classes}
      disabled={disabled || loading}
      aria-busy={loading || undefined}
      {...buttonRest}
    >
      {content}
    </button>
  )
}
