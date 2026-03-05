import { Link } from '@tanstack/react-router'
import { ArrowLeft } from 'lucide-react'
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
        <section className="auth-card">
          <div className="back-topbar">
            <Link
              to="/"
              className="back-link"
              aria-label="Retour"
              title="Retour à la page précédente"
            >
              <ArrowLeft size={18} />
            </Link>
          </div>
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
