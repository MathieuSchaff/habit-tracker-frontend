import { Link, useNavigate } from '@tanstack/react-router'
import { LogIn, LogOut, User, UserPlus } from 'lucide-react'
import { useRef, useState } from 'react'

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
  const navigate = useNavigate()
  const { data: profile } = useQuery(profileQueries.me())
  const isAuthenticated = useAuthStore((state) => !!state.accessToken)
  const logout = useLogout()

  const closeMenu = () => setIsOpen(false)
  const toggleMenu = () => setIsOpen((prev) => !prev)

  useClickOutside(menuRef, closeMenu)

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
        type="button"
        className={`user-menu__trigger ${isOpen ? 'user-menu__trigger--active' : ''}`}
        onClick={toggleMenu}
        aria-expanded={isOpen}
        aria-haspopup="true"
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
          className={`user-menu__dropdown ${isSidebarOpen ? 'user-menu__dropdown--sidebar-open' : ''}`}
        >
          <ul className="user-menu__list">
            {isAuthenticated ? (
              <>
                <li>
                  <Link to="/profile" className="user-menu__item" onClick={handleItemClick}>
                    <User size={16} />
                    <span>Profil</span>
                  </Link>
                </li>
                <li>
                  <button
                    type="button"
                    className="user-menu__item user-menu__item--danger"
                    onClick={handleLogout}
                    disabled={logout.isPending}
                  >
                    <LogOut size={16} />
                    <span>{logout.isPending ? 'Déconnexion...' : 'Déconnexion'}</span>
                  </button>
                </li>
              </>
            ) : (
              <>
                <li>
                  <Link to="/auth/login" className="user-menu__item" onClick={handleItemClick}>
                    <LogIn size={16} />
                    <span>Connexion</span>
                  </Link>
                </li>
                <li>
                  <Link to="/auth/signup" className="user-menu__item" onClick={handleItemClick}>
                    <UserPlus size={16} />
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
