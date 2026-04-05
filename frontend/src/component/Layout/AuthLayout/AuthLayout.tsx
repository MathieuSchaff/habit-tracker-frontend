import { Link } from '@tanstack/react-router'
import type { ReactNode } from 'react'

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
        <section className="auth-card" aria-label="Authentification">
          {children}
        </section>

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
