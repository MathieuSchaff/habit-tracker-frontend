import { Link, useNavigate, useRouterState } from '@tanstack/react-router'
import { CircleCheckBig, FlaskConical, LogOut, MoreHorizontal, Repeat, User } from 'lucide-react'
import { useCallback, useEffect, useRef, useState } from 'react'

import { useLogout } from '../../../lib/queries/auth'
import { useAuthStore } from '../../../store/auth'
import { ThemeToggle } from '../../Themetoggle/Themetoggle'
import './BottomNav.css'

import { ChestIcon, HomeIcon, ProductNavIcon } from '@/assets/icons'

export function BottomNav() {
  const [sheetOpen, setSheetOpen] = useState(false)
  const navigate = useNavigate()
  const isAuthenticated = useAuthStore((state) => !!state.accessToken)
  const logout = useLogout()
  const pathname = useRouterState({ select: (s) => s.location.pathname })
  const sheetRef = useRef<HTMLDivElement>(null)
  const triggerRef = useRef<HTMLButtonElement>(null)

  const closeSheet = useCallback(() => {
    setSheetOpen(false)
    triggerRef.current?.focus()
  }, [])
  const toggleSheet = () => setSheetOpen((prev) => !prev)

  // Focus first link when sheet opens
  useEffect(() => {
    if (sheetOpen) {
      const firstFocusable = sheetRef.current?.querySelector<HTMLElement>('a, button')
      firstFocusable?.focus()
    }
  }, [sheetOpen])

  // Escape + focus trap
  useEffect(() => {
    if (!sheetOpen) return

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        closeSheet()
        return
      }

      if (e.key === 'Tab') {
        const focusable = sheetRef.current?.querySelectorAll<HTMLElement>(
          'a, button, input, [tabindex]:not([tabindex="-1"])'
        )
        if (!focusable?.length) return

        const first = focusable[0]
        const last = focusable[focusable.length - 1]

        if (e.shiftKey && document.activeElement === first) {
          e.preventDefault()
          last.focus()
        } else if (!e.shiftKey && document.activeElement === last) {
          e.preventDefault()
          first.focus()
        }
      }
    }

    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [sheetOpen, closeSheet])

  const handleLogout = () => {
    logout.mutate(undefined, {
      onSuccess: () => {
        closeSheet()
        navigate({ to: '/auth/login' })
      },
    })
  }

  const isActive = (path: string) => pathname === path

  return (
    <>
      {sheetOpen && <div className="bottom-nav__overlay" onClick={closeSheet} aria-hidden="true" />}

      <div
        ref={sheetRef}
        className={`bottom-nav__sheet${sheetOpen ? ' bottom-nav__sheet--open' : ''}`}
        role="dialog"
        aria-label="Menu supplémentaire"
        aria-hidden={!sheetOpen}
      >
        <Link to="/" className="bottom-nav__sheet-link" onClick={closeSheet}>
          <HomeIcon size={20} strokeWidth={1.5} aria-hidden="true" />
          Accueil
        </Link>
        <Link to="/products" className="bottom-nav__sheet-link" onClick={closeSheet}>
          <ProductNavIcon size={20} strokeWidth={1.5} aria-hidden="true" />
          Produits
        </Link>
        <Link to="/ingredients" className="bottom-nav__sheet-link" onClick={closeSheet}>
          <FlaskConical size={20} strokeWidth={1.5} aria-hidden="true" />
          Ingrédients
        </Link>

        <div className="bottom-nav__sheet-divider" />

        {isAuthenticated ? (
          <>
            <Link to="/profile" className="bottom-nav__sheet-link" onClick={closeSheet}>
              <User size={20} strokeWidth={1.5} aria-hidden="true" />
              Profil
            </Link>

            <div className="bottom-nav__sheet-row">
              <span className="bottom-nav__sheet-row-label">Thème</span>
              <ThemeToggle />
            </div>

            <div className="bottom-nav__sheet-divider" />

            <button
              type="button"
              className="bottom-nav__sheet-logout"
              onClick={handleLogout}
              disabled={logout.isPending}
            >
              <LogOut size={20} strokeWidth={1.5} aria-hidden="true" />
              {logout.isPending ? 'Déconnexion...' : 'Déconnexion'}
            </button>
          </>
        ) : (
          <>
            <div className="bottom-nav__sheet-row">
              <span className="bottom-nav__sheet-row-label">Thème</span>
              <ThemeToggle />
            </div>

            <div className="bottom-nav__sheet-divider" />

            <Link to="/auth/login" className="bottom-nav__sheet-auth-link" onClick={closeSheet}>
              Connexion
            </Link>
            <Link to="/auth/signup" className="bottom-nav__sheet-auth-link" onClick={closeSheet}>
              S'inscrire
            </Link>
          </>
        )}
      </div>

      <nav className="bottom-nav" aria-label="Navigation principale mobile">
        <Link
          to="/collection"
          className={`bottom-nav__tab${isActive('/collection') ? ' bottom-nav__tab--active' : ''}`}
          aria-label="Collection"
          aria-current={isActive('/collection') ? 'page' : undefined}
        >
          <ChestIcon size={22} strokeWidth={1.5} aria-hidden="true" />
          Collection
        </Link>

        <Link
          to="/habits"
          className={`bottom-nav__tab${isActive('/habits') ? ' bottom-nav__tab--active' : ''}`}
          aria-label="Habitudes"
          aria-current={isActive('/habits') ? 'page' : undefined}
        >
          <Repeat size={22} strokeWidth={1.5} aria-hidden="true" />
          Habitudes
        </Link>

        <Link
          to="/tasks"
          className={`bottom-nav__tab${isActive('/tasks') ? ' bottom-nav__tab--active' : ''}`}
          aria-label="Tâches"
          aria-current={isActive('/tasks') ? 'page' : undefined}
        >
          <CircleCheckBig size={22} strokeWidth={1.5} aria-hidden="true" />
          Tâches
        </Link>

        <button
          ref={triggerRef}
          type="button"
          className={`bottom-nav__tab${sheetOpen ? ' bottom-nav__tab--sheet-open' : ''}`}
          onClick={toggleSheet}
          aria-label={sheetOpen ? 'Fermer le menu' : 'Ouvrir le menu'}
          aria-expanded={sheetOpen}
        >
          <MoreHorizontal
            size={22}
            strokeWidth={1.5}
            aria-hidden="true"
            className={`bottom-nav__icon${sheetOpen ? ' bottom-nav__icon--open' : ''}`}
          />
          Plus
        </button>
      </nav>
    </>
  )
}
