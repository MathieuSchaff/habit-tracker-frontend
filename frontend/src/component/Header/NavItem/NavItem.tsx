import { Link, useRouterState } from '@tanstack/react-router'

import { useAuthStore } from '../../../store/auth'
import { navItems } from './navItems'

interface NavSideListProps {
  onItemClick?: () => void
  className?: string
}

export function NavSideList({ onItemClick, className = '' }: NavSideListProps) {
  const pathname = useRouterState({ select: (s) => s.location.pathname })
  const isAuthenticated = useAuthStore((state) => !!state.accessToken)
  // During the optimistic boot probe a hint user is likely logged in; hide the anonymous-only
  // Home link so it doesn't flash in then out once the token lands.
  const bootRefreshPending = useAuthStore((state) => state.bootRefreshPending)
  const visibleItems =
    isAuthenticated || bootRefreshPending ? navItems.filter((item) => item.to !== '/') : navItems

  return (
    <ul id="main-nav-list" className={`main-nav__list ${className}`}>
      {visibleItems.map((item) => (
        <li key={item.to as string}>
          <Link
            to={item.to}
            className="main-nav__link"
            onClick={onItemClick}
            aria-current={pathname === item.to ? 'page' : undefined}
          >
            <item.icon size={18} className="main-nav__icon" aria-hidden="true" />
            <span className="main-nav__label">{item.label}</span>
          </Link>
        </li>
      ))}
    </ul>
  )
}
