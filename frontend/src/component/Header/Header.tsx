import { PanelLeftOpen } from 'lucide-react'
import { useCallback, useEffect, useRef, useState } from 'react'

import { useClickOutside } from '../../hooks/useClickOutside'
import { AuroreLogo } from '../Logo/Logo'
import { ThemeToggle } from '../Themetoggle/Themetoggle'
import { NavSideList } from './NavItem/NavItem'
import { UserMenu } from './UserMenu/UserMenu'

export const Header = () => {
  const [isOpen, setIsOpen] = useState(false)
  const navRef = useRef<HTMLElement>(null)

  const closeMenu = useCallback(() => setIsOpen(false), [])
  const toggleMenu = () => setIsOpen((prev) => !prev)

  useClickOutside(navRef, closeMenu)

  useEffect(() => {
    if (!isOpen) return

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') closeMenu()
    }

    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [isOpen, closeMenu])

  return (
    <header className="main-header">
      <nav
        ref={navRef}
        className={`main-nav ${isOpen ? 'main-nav--open' : ''}`}
        aria-label="Navigation principale"
        style={{ viewTransitionName: 'main-nav' }}
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
