import type { LinkProps } from '@tanstack/react-router'
import type { LucideProps } from 'lucide-react'
import { BookOpen, Columns2, FlaskConical } from 'lucide-react'

import { ChestIcon, HomeIcon, ProductNavIcon } from '@/assets/icons'

export interface NavItem {
  to: LinkProps['to']
  icon: React.ComponentType<LucideProps>
  label: string
}

export const navItems: NavItem[] = [
  { to: '/', icon: HomeIcon, label: 'Accueil' },
  { to: '/products', icon: ProductNavIcon, label: 'Produits' },
  { to: '/ingredients', icon: FlaskConical, label: 'Ingrédients' },
  { to: '/collection', icon: ChestIcon, label: 'Collection' },
  { to: '/products/compare', icon: Columns2, label: 'Comparaisons' },
  { to: '/blog', icon: BookOpen, label: 'Blog' },
]
