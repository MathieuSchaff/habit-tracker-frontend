import { Link } from '@tanstack/react-router'
import type { ReactNode } from 'react'
import './AuthLayout.css'

import { AuroreLogo } from '../../Logo/Logo'

type AuthLayoutProps = {
  children: ReactNode
  footer?: {
    text: string
    to: string
    label: string
  }
}

export const AuthLayout = ({ children, footer }: AuthLayoutProps) => {
  return (
    <main className="auth-layout">
      <div className="auth-container">
        <div className="auth-brand">
          <span className="auth-brand__icon" aria-hidden="true">
            <AuroreLogo size={60} />
          </span>
          Aurore
        </div>

        <section className="auth-card">{children}</section>

        {footer && (
          <footer className="auth-footer">
            <span className="auth-footer__text">{footer.text}</span>
            <Link to={footer.to} className="auth-footer__link">
              {footer.label}
            </Link>
          </footer>
        )}
      </div>
    </main>
  )
}
