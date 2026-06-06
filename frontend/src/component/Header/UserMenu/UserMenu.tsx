import { useQuery } from '@tanstack/react-query'
import { Link, useNavigate } from '@tanstack/react-router'
import { FileText, LogIn, LogOut, Shield, User, UserPlus } from 'lucide-react'

import { DropdownMenu } from '@/component/DropdownMenu/DropdownMenu'
import { profileQueries } from '@/lib/queries/profile'
import { ProfileAvatar } from '../../../features/profile/components/ProfileAvatar/ProfileAvatar'
import { useLogout } from '../../../lib/queries/auth'
import { useAuthStore } from '../../../store/auth'
import './UserMenu.css'

interface UserMenuProps {
  onItemClick?: () => void
  isSidebarOpen?: boolean
}

export const UserMenu = ({ onItemClick, isSidebarOpen = false }: UserMenuProps) => {
  const navigate = useNavigate()
  const { data: profile } = useQuery(profileQueries.me())
  const isAuthenticated = useAuthStore((state) => !!state.accessToken)
  // « Modération » reaches admin AND contributor (« modérateur »); both land on the
  // report queue (/admin/users is admin-only).
  const isContentModerator = useAuthStore(
    (state) => state.role === 'admin' || state.role === 'contributor'
  )
  const logout = useLogout()

  const handleLogout = () => {
    logout.mutate(undefined, {
      onSuccess: () => {
        onItemClick?.()
        navigate({ to: '/auth/login', search: { redirect: undefined } })
      },
    })
  }

  return (
    <DropdownMenu className={`user-menu${isSidebarOpen ? ' user-menu--sidebar-open' : ''}`}>
      <DropdownMenu.Trigger>
        <button type="button" className="user-menu__trigger" aria-label="Menu utilisateur">
          <ProfileAvatar avatarUrl={profile?.avatarUrl} username={profile?.username} size="sm" />
          {isSidebarOpen && (
            <span className="user-menu__username">
              {isAuthenticated ? profile?.username || 'Utilisateur' : 'Se connecter'}
            </span>
          )}
        </button>
      </DropdownMenu.Trigger>

      <DropdownMenu.Content
        side="top"
        align="start"
        ariaLabel="Menu utilisateur"
        className={`user-menu__dropdown${isSidebarOpen ? ' user-menu__dropdown--sidebar-open' : ''}`}
      >
        {isAuthenticated ? (
          <>
            <DropdownMenu.Item onSelect={onItemClick}>
              <Link to="/profile">
                <User size={16} aria-hidden="true" />
                <span>Profil</span>
              </Link>
            </DropdownMenu.Item>
            <DropdownMenu.Item onSelect={onItemClick}>
              <Link to="/submissions">
                <FileText size={16} aria-hidden="true" />
                <span>Mes soumissions</span>
              </Link>
            </DropdownMenu.Item>
            {isContentModerator && (
              <DropdownMenu.Item onSelect={onItemClick}>
                <Link to="/admin/reports">
                  <Shield size={16} aria-hidden="true" />
                  <span>Modération</span>
                </Link>
              </DropdownMenu.Item>
            )}
            <DropdownMenu.Item variant="danger" onSelect={handleLogout}>
              <button type="button" disabled={logout.isPending}>
                <LogOut size={16} aria-hidden="true" />
                <span>{logout.isPending ? 'Déconnexion...' : 'Déconnexion'}</span>
              </button>
            </DropdownMenu.Item>
          </>
        ) : (
          <>
            <DropdownMenu.Item onSelect={onItemClick}>
              <Link to="/auth/login" search={{ redirect: undefined }}>
                <LogIn size={16} aria-hidden="true" />
                <span>Connexion</span>
              </Link>
            </DropdownMenu.Item>
            <DropdownMenu.Item onSelect={onItemClick}>
              <Link to="/auth/signup">
                <UserPlus size={16} aria-hidden="true" />
                <span>S'inscrire</span>
              </Link>
            </DropdownMenu.Item>
          </>
        )}
      </DropdownMenu.Content>
    </DropdownMenu>
  )
}
