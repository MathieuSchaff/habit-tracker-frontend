import { Link } from '@tanstack/react-router'

import './CollectionSubNav.css'

type View = 'shelf' | 'motifs' | 'achats'

interface CollectionSubNavProps {
  current: View
}

const VIEWS: { key: View; label: string; to: string }[] = [
  { key: 'shelf', label: 'Collection', to: '/collection' },
  { key: 'motifs', label: 'Motifs', to: '/collection/motifs' },
  { key: 'achats', label: 'Achats', to: '/collection/achats' },
]

export function CollectionSubNav({ current }: CollectionSubNavProps) {
  const others = VIEWS.filter((v) => v.key !== current)
  return (
    <nav className="coll-subnav" aria-label="Vues de la collection">
      {others.map((v, idx) => (
        <span key={v.key} className="coll-subnav-item">
          {idx > 0 && (
            <span className="coll-subnav-sep" aria-hidden="true">
              ·
            </span>
          )}
          <Link to={v.to} className="coll-subnav-link">
            {v.label}
          </Link>
        </span>
      ))}
    </nav>
  )
}
