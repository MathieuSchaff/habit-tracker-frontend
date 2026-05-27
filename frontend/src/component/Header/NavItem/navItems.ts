import type { LinkProps } from '@tanstack/react-router'
import type { LucideProps } from 'lucide-react'
import { BookOpen, CircleCheckBig, FlaskConical } from 'lucide-react'

import { ChestIcon, HomeIcon, ProductNavIcon } from '@/assets/icons'

export interface NavItem {
  to: LinkProps['to']
  icon: React.ComponentType<LucideProps>
  label: string
}

export const navItems: NavItem[] = [
  { to: '/', icon: HomeIcon, label: 'Accueil' },
  { to: '/products', icon: ProductNavIcon, label: 'Produits' },
  { to: '/ingredients', icon: FlaskConical, label: 'Ingredients' },
  { to: '/blog', icon: BookOpen, label: 'Blog' },
  { to: '/collection', icon: ChestIcon, label: 'Collection' },
  { to: '/tasks', icon: CircleCheckBig, label: 'Tâches' },
]
