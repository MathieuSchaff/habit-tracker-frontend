import { Link } from '@tanstack/react-router'

import { AuroreBrandMark } from '../primitives/AuroreBrandMark'
import { Container } from '../sections/Section'
import './Footer.css'

export function Footer() {
  return (
    <footer className="aur-footer">
      <Container>
        <div className="aur-footer__inner">
          <Link to="/" className="aur-footer__brand">
            <AuroreBrandMark size={20} />
            <span className="aur-footer__brand-name">AURORE</span>
            <span className="aur-footer__brand-note">— Bêta · 2026</span>
          </Link>
          <nav className="aur-footer__links" aria-label="Pied de page">
            <Link to="/privacy" className="aur-footer__link">
              Politique de confidentialité
            </Link>
            <Link to="/blog" className="aur-footer__link">
              Blog
            </Link>
            <Link to="/about" className="aur-footer__link">
              À propos
            </Link>
            <a href="mailto:hello@aurore.app" className="aur-footer__link">
              Contact
            </a>
          </nav>
        </div>
      </Container>
    </footer>
  )
}
