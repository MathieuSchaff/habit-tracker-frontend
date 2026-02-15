import clsx from 'clsx'

import { Spinner } from '../Feedback/Spinner/Spinner'

type ButtonProps = {
  variant?: 'primary' | 'secondary' | 'outline' | 'ghost'
  size?: 'sm' | 'md' | 'lg'
  loading?: boolean
  fullWidth?: boolean
  type: 'submit' | 'button' | 'reset'
} & Omit<React.ComponentProps<'button'>, 'type'>

export const Button = ({
  variant = 'primary',
  size = 'md',
  loading = false,
  fullWidth = false,
  type = 'button',
  disabled,
  children,
  className,

  ...rest
}: ButtonProps) => {
  const classes = clsx(
    'button',
    variant,
    size,
    fullWidth && 'full-width',
    loading && 'loading',
    className
  )

  return (
    <button type={type} className={classes} disabled={disabled || loading} {...rest}>
      {loading && <Spinner />}
      <span className={loading ? 'sr-only' : undefined}>{children}</span>
    </button>
  )
}
