import type { LinkProps } from '@tanstack/react-router'
import type { LucideProps } from 'lucide-react'
import { BookOpen, Columns2, FlaskConical } from 'lucide-react'

import { ChestIcon, HomeIcon, ProductNavIcon } from '@/assets/icons'

export interface NavItem {
  to: LinkProps['to']
  icon: React.ComponentType<LucideProps>
  label: string
  // Gate a link on session state. Omitted = shown to everyone. 'authed' links point at
  // requireAuth routes (don't advertise a login wall); 'anon' only makes sense logged-out.
  visibility?: 'authed' | 'anon'
}

export const navItems: NavItem[] = [
  { to: '/', icon: HomeIcon, label: 'Accueil', visibility: 'anon' },
  { to: '/products', icon: ProductNavIcon, label: 'Produits' },
  { to: '/ingredients', icon: FlaskConical, label: 'Ingrédients' },
  { to: '/collection', icon: ChestIcon, label: 'Collection', visibility: 'authed' },
  { to: '/products/compare', icon: Columns2, label: 'Comparaisons', visibility: 'authed' },
  { to: '/blog', icon: BookOpen, label: 'Blog' },
]
