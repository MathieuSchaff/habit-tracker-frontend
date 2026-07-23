import { Link } from '@tanstack/react-router'
import { Menu, X } from 'lucide-react'
import { useCallback, useId, useRef, useState } from 'react'

import { useIsBelowLg } from '../../hooks/useIsBelowLg'
import { DialogPrimitive } from '../Dialog/DialogPrimitive'
import { AuroreLogo } from '../Logo/Logo'
import { ThemeToggle } from '../ThemeToggle/ThemeToggle'
import { NavSideList } from './NavItem/NavItem'
import { UserMenu } from './UserMenu/UserMenu'

// Import after DialogPrimitive so it can override the .dialog-content.
import './NavDrawer.css'

export const Header = () => {
  const isBelowLg = useIsBelowLg()
  const [isOpen, setIsOpen] = useState(false)
  const toggleRef = useRef<HTMLButtonElement>(null)
  const drawerCloseRef = useRef<HTMLButtonElement>(null)
  const drawerTitleId = useId()

  // Close the drawer when the viewport crosses the inline breakpoint so an open drawer
  // never lingers as a stray modal once the desktop bar shows its links inline.
  const [prevBelowLg, setPrevBelowLg] = useState(isBelowLg)
  if (prevBelowLg !== isBelowLg) {
    setPrevBelowLg(isBelowLg)
    setIsOpen(false)
  }

  // The drawer is a native <dialog> (DialogPrimitive), which loses its focus restore when
  // React unmounts the node before close(), so hand focus back to the trigger ourselves.
  const closeDrawer = useCallback(() => {
    setIsOpen(false)
    setTimeout(() => toggleRef.current?.focus(), 0)
  }, [])
  const openDrawer = () => setIsOpen(true)

  return (
    <header className="main-header">
      <nav
        className="main-nav"
        aria-label="Navigation principale"
        style={{ viewTransitionName: 'main-nav' }}
        // UserMenu dropdown portals here (not document.body) so link clicks count as inside.
        data-dropdown-boundary
      >
        <div className="main-nav__lead">
          <button
            ref={toggleRef}
            type="button"
            className="main-nav__toggle"
            onClick={openDrawer}
            aria-expanded={isOpen}
            aria-haspopup="dialog"
            aria-label="Ouvrir le menu"
          >
            <Menu size={22} strokeWidth={2} aria-hidden="true" />
          </button>
          <Link to="/" className="main-nav__logo" aria-label="Accueil">
            <AuroreLogo size={32} />
            <span className="main-nav__wordmark">Aurore</span>
          </Link>
        </div>

        <div className="main-nav__inline">
          <NavSideList variant="bar" />
        </div>

        <div className="main-nav__utils">
          <ThemeToggle />
          <UserMenu side="bottom" align="end" />
        </div>
      </nav>

      {isBelowLg && isOpen && (
        <DialogPrimitive
          onClose={closeDrawer}
          labelledBy={drawerTitleId}
          initialFocusRef={drawerCloseRef}
          className="main-nav-drawer"
        >
          <h2 id={drawerTitleId} className="sr-only">
            Navigation principale
          </h2>
          <div className="main-nav-drawer__header">
            <Link to="/" className="main-nav__logo" aria-label="Accueil" onClick={closeDrawer}>
              <AuroreLogo size={36} />
              <span className="main-nav__wordmark">Aurore</span>
            </Link>
            <button
              ref={drawerCloseRef}
              type="button"
              className="main-nav__toggle"
              onClick={closeDrawer}
              aria-label="Fermer le menu"
            >
              <X size={22} strokeWidth={2} aria-hidden="true" />
            </button>
          </div>
          <div className="main-nav-drawer__content">
            <NavSideList variant="drawer" onItemClick={closeDrawer} />
          </div>
          <div className="main-nav-drawer__footer">
            <ThemeToggle />
            <UserMenu variant="drawer" onItemClick={closeDrawer} />
          </div>
        </DialogPrimitive>
      )}
    </header>
  )
}
