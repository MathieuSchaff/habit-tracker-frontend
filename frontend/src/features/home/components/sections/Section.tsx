import './shared.css'

/** Section eyebrow — small dot + section number + label. */
export function SectionEyebrow({
  num,
  children,
  className,
}: {
  num: string
  children: React.ReactNode
  className?: string
}) {
  return (
    <span className={['aur-eyebrow', className].filter(Boolean).join(' ')}>
      <span className="aur-eyebrow__dot" />
      <span className="aur-eyebrow__num">
        {num} · {children}
      </span>
    </span>
  )
}

/** Standard section header — eyebrow + title + lede. */
export function SectionHead({
  num,
  eyebrow,
  title,
  lede,
}: {
  num: string
  eyebrow: string
  title: React.ReactNode
  lede?: React.ReactNode
}) {
  return (
    <header className="aur-section__head">
      <SectionEyebrow num={num}>{eyebrow}</SectionEyebrow>
      <h2 className="aur-section-title">{title}</h2>
      {lede ? <p className="aur-section-lede">{lede}</p> : null}
    </header>
  )
}

/** Container — capped width + page gutter. */
export function Container({
  children,
  className,
}: {
  children: React.ReactNode
  className?: string
}) {
  return <div className={['aur-container', className].filter(Boolean).join(' ')}>{children}</div>
}
