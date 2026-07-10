import { Link } from '@tanstack/react-router'
import { Menu, PanelLeftOpen, X } from 'lucide-react'
import { useCallback, useId, useLayoutEffect, useRef, useState } from 'react'

import { useCaptureDismiss } from '../../hooks/useCaptureDismiss'
import { useEscapeKey } from '../../hooks/useEscapeKey'
import { useIsMobile } from '../../hooks/useIsMobile'
import { DialogPrimitive } from '../Dialog/DialogPrimitive'
import { AuroreLogo } from '../Logo/Logo'
import { ThemeToggle } from '../ThemeToggle/ThemeToggle'
import { NavSideList } from './NavItem/NavItem'
import { UserMenu } from './UserMenu/UserMenu'

// Import after DialogPrimitive so it can override win the .dialog-content.
import './NavDrawer.css'

export const Header = () => {
  const isMobile = useIsMobile()
  const [isOpen, setIsOpen] = useState(false)
  const navRef = useRef<HTMLElement>(null)
  const toggleRef = useRef<HTMLButtonElement>(null)
  const drawerCloseRef = useRef<HTMLButtonElement>(null)
  const drawerTitleId = useId()

  // Close on breakpoint crossing so the desktop sidebar state never turns into an
  // unrequested modal drawer (or vice versa) mid-resize.
  const [prevIsMobile, setPrevIsMobile] = useState(isMobile)
  if (prevIsMobile !== isMobile) {
    setPrevIsMobile(isMobile)
    setIsOpen(false)
  }

  // biome-ignore lint/correctness/useExhaustiveDependencies: isMobile is a re-run trigger, not read inside.
  useLayoutEffect(() => {
    const nav = navRef.current
    if (!nav) return
    nav.classList.add('main-nav--no-transition')
    const id = requestAnimationFrame(() => nav.classList.remove('main-nav--no-transition'))
    return () => cancelAnimationFrame(id)
  }, [isMobile])

  const closeMenu = useCallback(() => setIsOpen(false), [])
  // Drawer closes lose the native <dialog> focus restore (React unmounts the node before
  // close()), so hand focus back to the trigger ourselves, like FilterDrawer.
  const closeDrawer = useCallback(() => {
    setIsOpen(false)
    setTimeout(() => toggleRef.current?.focus(), 0)
  }, [])
  const toggleMenu = () => setIsOpen((prev) => !prev)

  // Desktop-only dismiss handlers: the mobile drawer is a native <dialog> that brings its
  // own backdrop-click and Escape handling (see DialogPrimitive). Skip Escape while a
  // dropdown is open so it peels the dropdown first, mirroring DialogPrimitive.
  useCaptureDismiss(navRef, closeMenu, { enabled: isOpen && !isMobile })
  useEscapeKey(() => {
    if (isOpen && !isMobile && !document.body.dataset.dropdownMenuOpen) closeMenu()
  })

  return (
    <header className="main-header">
      <nav
        ref={navRef}
        className={`main-nav ${isOpen && !isMobile ? 'main-nav--open' : ''}`}
        aria-label="Navigation principale"
        style={{ viewTransitionName: 'main-nav' }}
        // UserMenu dropdown portals here (not document.body) so the nav capture-dismiss
        //  item click as inside else it swallows them and links never fire.
        data-dropdown-boundary
      >
        <div className="main-nav__header">
          <Link to="/" className="main-nav__logo" aria-label="Accueil" onClick={closeMenu}>
            <AuroreLogo size={36} />
            <span className="main-nav__wordmark">Aurore</span>
          </Link>
          <button
            ref={toggleRef}
            type="button"
            className="main-nav__toggle"
            onClick={toggleMenu}
            aria-expanded={isOpen}
            aria-controls={isMobile ? undefined : 'main-nav-list'}
            aria-haspopup={isMobile ? 'dialog' : undefined}
            aria-label={isOpen ? 'Fermer le menu' : 'Ouvrir le menu'}
          >
            <Menu className="main-nav__burger" size={22} strokeWidth={2} aria-hidden="true" />
            <PanelLeftOpen className="main-nav__panel" size={20} aria-hidden="true" />
          </button>
        </div>
        {!isMobile && (
          <>
            <div className="main-nav__content">
              <NavSideList onItemClick={closeMenu} />
            </div>
            <div className="main-nav__footer">
              <ThemeToggle />
              <UserMenu isSidebarOpen={isOpen} onItemClick={closeMenu} />
            </div>
          </>
        )}
      </nav>
      {isMobile && isOpen && (
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
            <NavSideList onItemClick={closeDrawer} />
          </div>
          <div className="main-nav-drawer__footer">
            <ThemeToggle />
            <UserMenu isSidebarOpen onItemClick={closeDrawer} />
          </div>
        </DialogPrimitive>
      )}
    </header>
  )
}
