import { Link } from '@tanstack/react-router'
import { PanelLeftOpen } from 'lucide-react'
import { useCallback, useRef, useState } from 'react'

import { useCaptureDismiss } from '../../hooks/useCaptureDismiss'
import { useEscapeKey } from '../../hooks/useEscapeKey'
import { AuroreLogo } from '../Logo/Logo'
import { ThemeToggle } from '../ThemeToggle/ThemeToggle'
import { NavSideList } from './NavItem/NavItem'
import { UserMenu } from './UserMenu/UserMenu'

export const Header = () => {
  const [isOpen, setIsOpen] = useState(false)
  const navRef = useRef<HTMLElement>(null)

  const closeMenu = useCallback(() => setIsOpen(false), [])
  const toggleMenu = () => setIsOpen((prev) => !prev)

  // Nav drawer floats over the main app content (Links, cards). Tap outside
  // must dismiss WITHOUT triggering the underlying card - see useCaptureDismiss
  // docs. Gated on isOpen so a closed nav never intercepts clicks app-wide.
  useCaptureDismiss(navRef, closeMenu, { enabled: isOpen })
  useEscapeKey(() => {
    if (isOpen) closeMenu()
  })

  return (
    <header className="main-header">
      <nav
        ref={navRef}
        className={`main-nav ${isOpen ? 'main-nav--open' : ''}`}
        aria-label="Navigation principale"
        style={{ viewTransitionName: 'main-nav' }}
      >
        <div className="main-nav__header">
          <Link to="/" className="main-nav__logo" aria-label="Accueil" onClick={closeMenu}>
            <AuroreLogo size={40} />
          </Link>
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
        <div className="main-nav__content">
          <NavSideList onItemClick={closeMenu} />
        </div>
        <div className="main-nav__footer">
          <ThemeToggle />
          <UserMenu isSidebarOpen={isOpen} onItemClick={closeMenu} />
        </div>
      </nav>
    </header>
  )
}
