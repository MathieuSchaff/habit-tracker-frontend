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
  const visibleItems = isAuthenticated ? navItems.filter((item) => item.to !== '/') : navItems

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
