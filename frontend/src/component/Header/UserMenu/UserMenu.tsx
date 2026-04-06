import { Link, useNavigate } from '@tanstack/react-router'
import { LogIn, LogOut, User, UserPlus } from 'lucide-react'
import { useCallback, useEffect, useRef, useState } from 'react'

import { ProfileAvatar } from '../../../features/profile/components/ProfileAvatar/ProfileAvatar'
import { useClickOutside } from '../../../hooks/useClickOutside'
import { useLogout } from '../../../lib/queries/auth'
import { useAuthStore } from '../../../store/auth'
import './UserMenu.css'

import { useQuery } from '@tanstack/react-query'

import { profileQueries } from '@/lib/queries/profile'

interface UserMenuProps {
  onItemClick?: () => void
  isSidebarOpen?: boolean
}

export const UserMenu = ({ onItemClick, isSidebarOpen = false }: UserMenuProps) => {
  const [isOpen, setIsOpen] = useState(false)
  const menuRef = useRef<HTMLDivElement>(null)
  const triggerRef = useRef<HTMLButtonElement>(null)
  const menuListRef = useRef<HTMLUListElement>(null)
  const navigate = useNavigate()
  const { data: profile } = useQuery(profileQueries.me())
  const isAuthenticated = useAuthStore((state) => !!state.accessToken)
  const logout = useLogout()

  const closeMenu = useCallback(() => {
    setIsOpen(false)
    triggerRef.current?.focus()
  }, [])

  const toggleMenu = () => setIsOpen((prev) => !prev)

  useClickOutside(menuRef, closeMenu)

  // Focus first menu item on open
  useEffect(() => {
    if (isOpen) {
      const firstItem = menuListRef.current?.querySelector<HTMLElement>('[role="menuitem"]')
      firstItem?.focus()
    }
  }, [isOpen])

  // Escape key + arrow key navigation
  useEffect(() => {
    if (!isOpen) return

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        closeMenu()
        return
      }

      if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
        e.preventDefault()
        const items = menuListRef.current?.querySelectorAll<HTMLElement>('[role="menuitem"]')
        if (!items?.length) return

        const currentIndex = Array.from(items).indexOf(document.activeElement as HTMLElement)
        const nextIndex =
          e.key === 'ArrowDown'
            ? (currentIndex + 1) % items.length
            : (currentIndex - 1 + items.length) % items.length
        items[nextIndex].focus()
      }
    }

    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [isOpen, closeMenu])

  const handleLogout = () => {
    logout.mutate(undefined, {
      onSuccess: () => {
        closeMenu()
        onItemClick?.()
        navigate({ to: '/auth/login' })
      },
    })
  }

  const handleItemClick = () => {
    closeMenu()
    onItemClick?.()
  }

  return (
    <div className={`user-menu ${isSidebarOpen ? 'user-menu--sidebar-open' : ''}`} ref={menuRef}>
      <button
        ref={triggerRef}
        type="button"
        className={`user-menu__trigger ${isOpen ? 'user-menu__trigger--active' : ''}`}
        onClick={toggleMenu}
        aria-expanded={isOpen}
        aria-haspopup="true"
        aria-controls="user-menu-dropdown"
        aria-label="Menu utilisateur"
      >
        <ProfileAvatar avatarUrl={profile?.avatarUrl} username={profile?.username} size="sm" />
        {isSidebarOpen && (
          <span className="user-menu__username">
            {isAuthenticated ? profile?.username || 'Utilisateur' : 'Se connecter'}
          </span>
        )}
      </button>

      {isOpen && (
        <div
          id="user-menu-dropdown"
          className={`user-menu__dropdown ${isSidebarOpen ? 'user-menu__dropdown--sidebar-open' : ''}`}
          role="menu"
          aria-label="Menu utilisateur"
        >
          <ul ref={menuListRef} className="user-menu__list">
            {isAuthenticated ? (
              <>
                <li role="none">
                  <Link
                    to="/profile"
                    className="user-menu__item"
                    role="menuitem"
                    onClick={handleItemClick}
                  >
                    <User size={16} aria-hidden="true" />
                    <span>Profil</span>
                  </Link>
                </li>
                <li role="none">
                  <button
                    type="button"
                    className="user-menu__item user-menu__item--danger"
                    role="menuitem"
                    onClick={handleLogout}
                    disabled={logout.isPending}
                  >
                    <LogOut size={16} aria-hidden="true" />
                    <span>{logout.isPending ? 'Déconnexion...' : 'Déconnexion'}</span>
                  </button>
                </li>
              </>
            ) : (
              <>
                <li role="none">
                  <Link
                    to="/auth/login"
                    className="user-menu__item"
                    role="menuitem"
                    onClick={handleItemClick}
                  >
                    <LogIn size={16} aria-hidden="true" />
                    <span>Connexion</span>
                  </Link>
                </li>
                <li role="none">
                  <Link
                    to="/auth/signup"
                    className="user-menu__item"
                    role="menuitem"
                    onClick={handleItemClick}
                  >
                    <UserPlus size={16} aria-hidden="true" />
                    <span>S'inscrire</span>
                  </Link>
                </li>
              </>
            )}
          </ul>
        </div>
      )}
    </div>
  )
}
