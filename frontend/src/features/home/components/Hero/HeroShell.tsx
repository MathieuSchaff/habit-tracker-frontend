import type { LinkProps } from '@tanstack/react-router'
import { ArrowRight } from 'lucide-react'

import { Button, ButtonLink } from '../../../../component/Button/Button'
import { AuroreBrandMark } from '../primitives/AuroreBrandMark'
import './Hero.css'

export type HeroAction = {
  label: string
  // Use `to` for internal TanStack routes, `href` for anchors/external.
  to?: LinkProps['to']
  href?: string
  onClick?: () => void
  loading?: boolean
}

export type HeroShellProps = {
  badge?: string
  title: React.ReactNode
  subtitle: string
  primary: HeroAction
  secondary?: HeroAction
  meta?: string[]
  note?: React.ReactNode
  layout?: 'split' | 'center'
  children: React.ReactNode
}

function renderAction(a: HeroAction, primaryStyle: boolean) {
  const variant = primaryStyle ? 'primary' : 'outline'
  const content = (
    <>
      {a.label}
      {primaryStyle ? <ArrowRight size={16} aria-hidden="true" /> : null}
    </>
  )
  if (a.to) {
    return (
      <ButtonLink variant={variant} size="lg" to={a.to}>
        {content}
      </ButtonLink>
    )
  }
  if (a.href) {
    return (
      <Button variant={variant} size="lg" href={a.href}>
        {content}
      </Button>
    )
  }
  return (
    <Button variant={variant} size="lg" onClick={a.onClick} loading={a.loading}>
      {content}
    </Button>
  )
}

export function HeroShell({
  badge,
  title,
  subtitle,
  primary,
  secondary,
  meta,
  note,
  layout = 'split',
  children,
}: HeroShellProps) {
  return (
    <section className={`aur-hero aur-hero--${layout}`}>
      <div className="aur-container">
        <div className="aur-hero__grid">
          <div className="aur-hero__copy">
            <div className="aur-hero__brand">
              <AuroreBrandMark size={26} />
              <span className="aur-hero__brand-name">AURORE</span>
              {badge ? <span className="aur-hero__badge">{badge}</span> : null}
            </div>
            <h1 className="aur-hero__title">{title}</h1>
            <p className="aur-hero__subtitle">{subtitle}</p>
            <div className="aur-hero__actions">
              {renderAction(primary, true)}
              {secondary ? renderAction(secondary, false) : null}
            </div>
            {meta?.length ? (
              <div className="aur-hero__meta">
                {meta.map((m) => (
                  <span className="aur-hero__meta-item" key={m}>
                    <span className="aur-hero__meta-dot" />
                    {m}
                  </span>
                ))}
              </div>
            ) : null}
            {note ? <p className="aur-hero__note">{note}</p> : null}
          </div>
          <div className="aur-hero__visual">{children}</div>
        </div>
      </div>
    </section>
  )
}
