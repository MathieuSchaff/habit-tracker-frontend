import { Link } from '@tanstack/react-router'
import type { ReactNode } from 'react'

// CSS rides the auth-route chunk (AuthLayout wraps all /auth/* routes) instead of
// shipping eager in index.css to every visitor.
import '@/features/auth/styles/auth-shared.css'
import './AuthLayout.css'

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
