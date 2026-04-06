import './Card.css'

type CardProps<T extends React.ElementType = 'div'> = {
  as?: T
  /** Must be a valid CSS color value, e.g. "var(--color-primary)", "oklch(60% 0.2 30)", "#e07" */
  accent?: string
  interactive?: boolean
  className?: string
  children: React.ReactNode
} & Omit<
  React.ComponentPropsWithoutRef<T>,
  'as' | 'accent' | 'children' | 'className' | 'interactive'
>

export function Card<T extends React.ElementType = 'div'>({
  as,
  accent,
  interactive,
  className,
  children,
  ...props
}: CardProps<T>) {
  const Tag = (as ?? 'div') as React.ElementType
  return (
    <Tag
      className={['card', interactive && 'card--interactive', className].filter(Boolean).join(' ')}
      style={accent ? ({ '--card-accent': accent } as React.CSSProperties) : undefined}
      {...props}
    >
      {children}
    </Tag>
  )
}
