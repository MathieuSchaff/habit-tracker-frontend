import './Card.css'

type ClassValue = string | false | null | undefined
const cx = (...values: ClassValue[]) => values.filter(Boolean).join(' ')

// ---------- Root ----------

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

function CardRoot<T extends React.ElementType = 'div'>({
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
      className={cx('card', interactive && 'card--interactive', className)}
      style={accent ? ({ '--card-accent': accent } as React.CSSProperties) : undefined}
      {...props}
    >
      {children}
    </Tag>
  )
}

// ---------- Sub-components ----------

type DivProps = React.HTMLAttributes<HTMLDivElement>

function CardMedia({ className, children, ...props }: DivProps) {
  return (
    <div className={cx('card__media', className)} {...props}>
      {children}
    </div>
  )
}

function CardBody({ className, children, ...props }: DivProps) {
  return (
    <div className={cx('card__body', className)} {...props}>
      {children}
    </div>
  )
}

type CardTitleProps<T extends React.ElementType = 'h3'> = {
  as?: T
  className?: string
  children: React.ReactNode
} & Omit<React.ComponentPropsWithoutRef<T>, 'as' | 'className' | 'children'>

function CardTitle<T extends React.ElementType = 'h3'>({
  as,
  className,
  children,
  ...props
}: CardTitleProps<T>) {
  const Tag = (as ?? 'h3') as React.ElementType
  return (
    <Tag className={cx('card__title', className)} {...props}>
      {children}
    </Tag>
  )
}

function CardDescription({
  className,
  children,
  ...props
}: React.HTMLAttributes<HTMLParagraphElement>) {
  return (
    <p className={cx('card__description', className)} {...props}>
      {children}
    </p>
  )
}

function CardFooter({ className, children, ...props }: DivProps) {
  return (
    <div className={cx('card__footer', className)} {...props}>
      {children}
    </div>
  )
}

function CardActions({ className, children, ...props }: DivProps) {
  return (
    <div className={cx('card__actions', className)} {...props}>
      {children}
    </div>
  )
}

// ---------- Compound export ----------

export const Card = Object.assign(CardRoot, {
  Media: CardMedia,
  Body: CardBody,
  Title: CardTitle,
  Description: CardDescription,
  Footer: CardFooter,
  Actions: CardActions,
})
