import { Link, useRouterState } from '@tanstack/react-router'

import { useBootPending } from '@/lib/hooks/useBootPending'
import { useAuthStore } from '@/store/auth'
import { navItems } from './navItems'

interface NavSideListProps {
  onItemClick?: () => void
  variant?: 'bar' | 'drawer'
}

export function NavSideList({ onItemClick, variant = 'drawer' }: NavSideListProps) {
  const pathname = useRouterState({ select: (s) => s.location.pathname })
  const isAuthenticated = useAuthStore((s) => !!s.accessToken)
  // Treat a hinted (likely-authed) visitor as authed during the boot probe so the link set
  // never flashes anon->authed on hydration; mirrors UserMenu's skeleton gate.
  const bootPending = useBootPending()
  const effectiveAuthed = isAuthenticated || bootPending

  const items = navItems.filter((item) => {
    if (item.visibility === 'authed') return effectiveAuthed
    if (item.visibility === 'anon') return !effectiveAuthed
    return true
  })

  // Longest matching route wins so a nested link (/products/compare) lights up alone,
  // while section links stay lit on their sub-pages (/products/:slug).
  const activeTo = items
    .map((item) => item.to as string)
    .filter((to) => pathname === to || pathname.startsWith(`${to}/`))
    .sort((a, b) => b.length - a.length)[0]

  return (
    <ul role="list" className={`main-nav__list main-nav__list--${variant}`}>
      {items.map((item) => (
        <li key={item.to as string}>
          <Link
            to={item.to}
            className="main-nav__link"
            onClick={onItemClick}
            // exact: keep the router from adding its fuzzy-match aria-current on top of ours.
            activeOptions={{ exact: true }}
            aria-current={item.to === activeTo ? 'page' : undefined}
          >
            <item.icon size={18} className="main-nav__icon" aria-hidden="true" />
            <span className="main-nav__label">{item.label}</span>
          </Link>
        </li>
      ))}
    </ul>
  )
}
