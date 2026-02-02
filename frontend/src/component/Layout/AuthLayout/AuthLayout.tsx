import { Link } from '@tanstack/react-router'
import './AuthLayout.css'

type FooterLink = {
  text: string
  to: string
  label: string
}

type AuthLayoutProps = {
  title: string
  footerLink: FooterLink
} & React.ComponentProps<'main'>

export const AuthLayout = ({ title, children, footerLink, ...props }: AuthLayoutProps) => {
  return (
    <main {...props} className="auth-layout">
      <h2>{title}</h2>
      <div className="auth-container">
        <section className="auth-card">{children}</section>
        <footer className="auth-footer">
          <span className="auth-footer-text">{footerLink.text}</span>
          <Link to={footerLink.to} className="auth-footer-link">
            {footerLink.label}
          </Link>
        </footer>
      </div>
    </main>
  )
}
