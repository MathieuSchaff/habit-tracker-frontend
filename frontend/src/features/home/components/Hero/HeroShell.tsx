import { Link } from '@tanstack/react-router'
import { ArrowRight } from 'lucide-react'

import { AuroreBrandMark } from '../primitives/AuroreBrandMark'
import './Hero.css'

export type HeroAction = {
  label: string
  // Use `to` for internal TanStack routes, `href` for anchors/external.
  to?: string
  href?: string
  onClick?: () => void
}

export type HeroShellProps = {
  badge?: string
  title: React.ReactNode
  subtitle: string
  primary: HeroAction
  secondary?: HeroAction
  meta?: string[]
  layout?: 'split' | 'center'
  children: React.ReactNode
}

export function HeroShell({
  badge,
  title,
  subtitle,
  primary,
  secondary,
  meta,
  layout = 'split',
  children,
}: HeroShellProps) {
  const renderAction = (a: HeroAction, primaryStyle: boolean) => {
    const cls = `aur-btn aur-btn--lg aur-btn--${primaryStyle ? 'primary' : 'ghost'}`
    const content = (
      <>
        {a.label}
        {primaryStyle ? <ArrowRight size={16} aria-hidden="true" /> : null}
      </>
    )
    if (a.to) {
      return (
        <Link to={a.to as never} className={cls}>
          {content}
        </Link>
      )
    }
    if (a.href) {
      return (
        <a href={a.href} className={cls}>
          {content}
        </a>
      )
    }
    return (
      <button type="button" className={cls} onClick={a.onClick}>
        {content}
      </button>
    )
  }

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
          </div>
          <div className="aur-hero__visual">{children}</div>
        </div>
      </div>
    </section>
  )
}
