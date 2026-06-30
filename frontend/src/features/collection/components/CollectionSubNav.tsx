import { Link } from '@tanstack/react-router'

import './CollectionSubNav.css'

// `exact` keeps the index link inactive while a child tab (motifs/achats) is open.
const VIEWS = [
  { label: 'Collection', to: '/collection', exact: true },
  { label: 'Motifs', to: '/collection/motifs', exact: false },
  { label: 'Achats', to: '/collection/achats', exact: false },
] as const

export function CollectionSubNav() {
  return (
    <nav className="coll-subnav" aria-label="Vues de la collection">
      {VIEWS.map((v) => (
        <Link
          key={v.to}
          to={v.to}
          className="coll-subnav-link"
          activeOptions={{ exact: v.exact }}
          activeProps={{ className: 'coll-subnav-link--active', 'aria-current': 'page' }}
        >
          {v.label}
        </Link>
      ))}
    </nav>
  )
}
