import type { LinkProps } from '@tanstack/react-router'
import { Link } from '@tanstack/react-router'
import type { LucideProps } from 'lucide-react'
import { Atom, Barcode, CheckSquare, Home, ListChecks } from 'lucide-react'
import { forwardRef } from 'react'

export const ShelvingUnit = forwardRef<SVGSVGElement, LucideProps>(
  ({ color = 'currentColor', size = 24, strokeWidth = 2, ...props }, ref) => (
    <svg
      ref={ref}
      xmlns="http://www.w3.org/2000/svg"
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke={color}
      strokeWidth={strokeWidth}
      strokeLinecap="round"
      strokeLinejoin="round"
      {...props}
    >
      <title>Shelving unit icon</title>
      <path d="M12 12V9a1 1 0 0 0-1-1H9a1 1 0 0 0-1 1v3" />
      <path d="M16 20v-3a1 1 0 0 0-1-1h-2a1 1 0 0 0-1 1v3" />
      <path d="M20 22V2" />
      <path d="M4 12h16" />
      <path d="M4 20h16" />
      <path d="M4 2v20" />
      <path d="M4 4h16" />
    </svg>
  )
)
ShelvingUnit.displayName = 'ShelvingUnit'

// Sidebar link definition
interface NavItem {
  to: LinkProps['to']
  icon: React.ComponentType<LucideProps>
  label: string
}

const navItems: NavItem[] = [
  { to: '/', icon: Home, label: 'Accueil' },
  { to: '/habits', icon: ListChecks, label: 'Habitudes' },
  { to: '/products', icon: Barcode, label: 'Produits' },
  { to: '/ingredients', icon: Atom, label: 'Ingredients' },
  { to: '/collection', icon: ShelvingUnit, label: 'Collection' },
  { to: '/tasks', icon: CheckSquare, label: 'Tâches' },
]

interface NavSideListProps {
  onItemClick?: () => void
  className?: string
}

export function NavSideList({ onItemClick, className = '' }: NavSideListProps) {
  return (
    <ul id="main-nav-list" className={`main-nav__list ${className}`}>
      {navItems.map((item) => (
        <li key={item.to as string}>
          <Link
            to={item.to}
            className="main-nav__link"
            onClick={onItemClick}
            aria-label={item.label}
          >
            <item.icon size={18} className="main-nav__icon" aria-hidden="true" />
            <span className="main-nav__label">{item.label}</span>
          </Link>
        </li>
      ))}
    </ul>
  )
}
