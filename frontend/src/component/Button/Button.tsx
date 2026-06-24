import { createLink } from '@tanstack/react-router'
import clsx from 'clsx'
import { forwardRef, type ReactNode } from 'react'

import { Spinner } from '../Feedback/ui/Spinner/Spinner'

type BaseProps = {
  variant?:
    | 'primary'
    | 'secondary'
    | 'outline'
    | 'ghost'
    | 'accent'
    | 'default'
    | 'danger-ghost'
    | 'bare'
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

type ButtonAsAnchorProps = BaseProps & {
  href: string
} & Omit<React.ComponentProps<'a'>, 'href' | 'children' | 'className'>

type ButtonProps = ButtonAsButtonProps | ButtonAsAnchorProps

// Router-link variant lives in its own component: a polymorphic union member
// can't be the generic <Link> that TanStack's route inference requires.
// createLink forwards full route type-safety (to/params/search), no casts.
type ButtonLinkBaseProps = BaseProps &
  Omit<React.AnchorHTMLAttributes<HTMLAnchorElement>, 'href' | 'children' | 'className'>

const ButtonLinkBase = forwardRef<HTMLAnchorElement, ButtonLinkBaseProps>(
  (
    {
      variant = 'primary',
      size = 'md',
      loading = false,
      fullWidth = false,
      children,
      className,
      ...rest
    },
    ref
  ) => (
    <a
      ref={ref}
      className={clsx(
        'button',
        variant,
        size,
        fullWidth && 'full-width',
        loading && 'loading',
        className
      )}
      aria-busy={loading || undefined}
      aria-disabled={loading || undefined}
      {...rest}
    >
      {loading && <Spinner />}
      {!loading && children}
    </a>
  )
)
ButtonLinkBase.displayName = 'ButtonLinkBase'

export const ButtonLink = createLink(ButtonLinkBase)

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

  if ('href' in props) {
    const {
      href,
      variant: _,
      size: _s,
      loading: _l,
      fullWidth: _fw,
      className: _cn,
      children: _ch,
      ...anchorRest
    } = props as ButtonAsAnchorProps

    return (
      <a
        href={href}
        className={classes}
        aria-busy={loading || undefined}
        aria-disabled={loading || undefined}
        {...anchorRest}
      >
        {content}
      </a>
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
    ...buttonRest
  } = props as ButtonAsButtonProps

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
