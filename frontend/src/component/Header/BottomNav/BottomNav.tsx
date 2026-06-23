import { Link, useNavigate, useRouterState } from '@tanstack/react-router'
import {
  BookOpen,
  CircleCheckBig,
  Columns2,
  FileText,
  FlaskConical,
  LogIn,
  LogOut,
  MoreHorizontal,
  User,
  UserPlus,
} from 'lucide-react'
import { useCallback, useState } from 'react'

import { ChestIcon, HomeIcon, ProductNavIcon } from '@/assets/icons'
import { Sheet } from '@/component/Dialog/Sheet'
import { useLogout } from '../../../lib/queries/auth'
import { useAuthStore } from '../../../store/auth'
import { ThemeToggle } from '../../ThemeToggle/ThemeToggle'

// Imported last so .bottom-nav__sheet overrides win the cascade over Sheet/DialogPrimitive base styles.
import './BottomNav.css'

export function BottomNav() {
  const [sheetOpen, setSheetOpen] = useState(false)
  const navigate = useNavigate()
  const isAuthenticated = useAuthStore((state) => !!state.accessToken)
  // Optimistic boot: while the probe is in flight, suppress the auth-specific sheet items so a
  // hint user doesn't flash the logged-out branch if they open the sheet within the window.
  const bootRefreshPending = useAuthStore((state) => state.bootRefreshPending)
  const logout = useLogout()
  const pathname = useRouterState({ select: (s) => s.location.pathname })
  // Native <dialog> (via Sheet) traps Tab, closes on Esc, and restores focus to the trigger.
  const closeSheet = useCallback(() => setSheetOpen(false), [])
  const toggleSheet = () => setSheetOpen((prev) => !prev)

  const handleLogout = () => {
    logout.mutate(undefined, {
      onSuccess: () => {
        closeSheet()
        navigate({ to: '/auth/login', search: { redirect: undefined } })
      },
    })
  }

  const isActive = (path: string) => pathname === path

  return (
    <>
      {sheetOpen && (
        <Sheet onClose={closeSheet} className="bottom-nav__sheet">
          <Sheet.Title className="sr-only">Menu supplémentaire</Sheet.Title>
          {!isAuthenticated && !bootRefreshPending && (
            <Link to="/" className="bottom-nav__sheet-link" onClick={closeSheet}>
              <HomeIcon size={20} strokeWidth={1.5} aria-hidden="true" />
              Accueil
            </Link>
          )}
          <Link to="/ingredients" className="bottom-nav__sheet-link" onClick={closeSheet}>
            <FlaskConical size={20} strokeWidth={1.5} aria-hidden="true" />
            Ingrédients
          </Link>
          <Link to="/blog" className="bottom-nav__sheet-link" onClick={closeSheet}>
            <BookOpen size={20} strokeWidth={1.5} aria-hidden="true" />
            Blog
          </Link>
          <Link to="/products/compare" className="bottom-nav__sheet-link" onClick={closeSheet}>
            <Columns2 size={20} strokeWidth={1.5} aria-hidden="true" />
            Comparaisons
          </Link>

          <div className="bottom-nav__sheet-divider" />

          {bootRefreshPending ? null : isAuthenticated ? (
            <>
              <Link to="/profile" className="bottom-nav__sheet-link" onClick={closeSheet}>
                <User size={20} strokeWidth={1.5} aria-hidden="true" />
                Profil
              </Link>
              <Link to="/submissions" className="bottom-nav__sheet-link" onClick={closeSheet}>
                <FileText size={20} strokeWidth={1.5} aria-hidden="true" />
                Mes soumissions
              </Link>
              <Link to="/tasks" className="bottom-nav__sheet-link" onClick={closeSheet}>
                <CircleCheckBig size={20} strokeWidth={1.5} aria-hidden="true" />
                Tâches
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

              <Link
                to="/auth/login"
                search={{ redirect: undefined }}
                className="bottom-nav__sheet-auth-link"
                onClick={closeSheet}
              >
                <LogIn size={20} strokeWidth={1.5} aria-hidden="true" />
                Connexion
              </Link>
              <Link to="/auth/signup" className="bottom-nav__sheet-auth-link" onClick={closeSheet}>
                <UserPlus size={20} strokeWidth={1.5} aria-hidden="true" />
                S'inscrire
              </Link>
            </>
          )}
        </Sheet>
      )}

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
          to="/products"
          className={`bottom-nav__tab${isActive('/products') ? ' bottom-nav__tab--active' : ''}`}
          aria-label="Produits"
          aria-current={isActive('/products') ? 'page' : undefined}
        >
          <ProductNavIcon size={22} strokeWidth={1.5} aria-hidden="true" />
          Produits
        </Link>

        <button
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
