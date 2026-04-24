import type { LinkProps } from '@tanstack/react-router'
import { Link, useRouterState } from '@tanstack/react-router'
import type { LucideProps } from 'lucide-react'
import { CircleCheckBig, CircleDot, FlaskConical } from 'lucide-react'

import { ChestIcon, HomeIcon, ProductNavIcon } from '@/assets/icons'

interface NavItem {
  to: LinkProps['to']
  icon: React.ComponentType<LucideProps>
  label: string
}

export const navItems: NavItem[] = [
  { to: '/', icon: HomeIcon, label: 'Accueil' },
  { to: '/habits', icon: CircleDot, label: 'Habitudes' },
  { to: '/products', icon: ProductNavIcon, label: 'Produits' },
  { to: '/ingredients', icon: FlaskConical, label: 'Ingredients' },
  { to: '/collection', icon: ChestIcon, label: 'Collection' },
  { to: '/tasks', icon: CircleCheckBig, label: 'Tâches' },
]

interface NavSideListProps {
  onItemClick?: () => void
  className?: string
}

export function NavSideList({ onItemClick, className = '' }: NavSideListProps) {
  const pathname = useRouterState({ select: (s) => s.location.pathname })

  return (
    <ul id="main-nav-list" className={`main-nav__list ${className}`}>
      {navItems.map((item) => (
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
