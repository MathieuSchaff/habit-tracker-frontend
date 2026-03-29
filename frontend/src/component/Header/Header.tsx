import { Link, useNavigate } from '@tanstack/react-router'
import { PanelLeftOpen } from 'lucide-react'
import { useRef, useState } from 'react'
import { toast } from 'sonner'

import { useClickOutside } from '../../hooks/useClickOutside'
import { useLogout, useResendVerification } from '../../lib/queries/auth'
import { useAuthStore } from '../../store/auth'
import { Button } from '../Button/Button'
import { AuroreLogo } from '../Logo/Logo'
import { ThemeToggle } from '../Themetoggle/Themetoggle'
import { NavSideList } from './NavItem/NavItem'

export const Header = () => {
  const [isOpen, setIsOpen] = useState(false)
  const navRef = useRef<HTMLElement>(null)
  const navigate = useNavigate()

  const isAuthenticated = useAuthStore((state) => !!state.accessToken)
  const emailVerified = useAuthStore((s) => s.emailVerified)
  const user = useAuthStore((s) => s.user)
  const logout = useLogout()
  const resend = useResendVerification()

  const handleResend = () => {
    resend.mutate(undefined, {
      onSuccess: () => toast.success('Email envoyé !'),
      onError: () => toast.error('Erreur, réessaie plus tard.'),
    })
  }

  const closeMenu = () => setIsOpen(false)
  const toggleMenu = () => setIsOpen((prev) => !prev)

  useClickOutside(navRef, closeMenu)

  const handleLogout = () => {
    logout.mutate(undefined, {
      onSuccess: () => {
        closeMenu()
        navigate({ to: '/login' })
      },
    })
  }

  return (
    <header className="main-header">
      {user && !emailVerified && (
        <div className="email-verification-banner">
          <span>Vérifiez votre adresse email pour continuer à utiliser Aurore.</span>
          <button type="button" onClick={handleResend} disabled={resend.isPending}>
            {resend.isPending ? '...' : 'Renvoyer'}
          </button>
        </div>
      )}
      <nav
        ref={navRef}
        className={`main-nav ${isOpen ? 'main-nav--open' : ''}`}
        aria-label="Navigation principale"
      >
        <div className="main-nav__header">
          <div className="main-nav__logo">
            <AuroreLogo size={40} />
          </div>

          <button
            type="button"
            className="main-nav__toggle"
            onClick={toggleMenu}
            aria-expanded={isOpen}
            aria-controls="main-nav-list"
            aria-label={isOpen ? 'Fermer le menu' : 'Ouvrir le menu'}
          >
            <PanelLeftOpen className="main-nav__icon" size={20} />
          </button>
        </div>
        <NavSideList onItemClick={closeMenu} />
      </nav>
      <nav className="nav-secondary" aria-label="Navigation secondaire">
        <ul className="secondary-nav__list">
          <li>
            <ThemeToggle />
          </li>
          {isAuthenticated ? (
            <>
              <li>
                <Link to="/profile" onClick={closeMenu} className="secondary-nav__link">
                  Profil
                </Link>
              </li>
              <li>
                <Button
                  type="button"
                  onClick={handleLogout}
                  disabled={logout.isPending}
                  className="secondary-nav__logout"
                  size="sm"
                >
                  {logout.isPending ? 'Déconnexion...' : 'Déconnexion'}
                </Button>
              </li>
            </>
          ) : (
            <>
              {' '}
              <li>
                <Link to="/login" onClick={closeMenu} className="secondary-nav__link">
                  Connexion
                </Link>
              </li>
              <li>
                <Link to="/signup" onClick={closeMenu} className="secondary-nav__cta">
                  S'inscrire
                </Link>
              </li>
            </>
          )}
        </ul>
      </nav>
    </header>
  )
}
