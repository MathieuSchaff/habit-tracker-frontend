import { Link, type LinkProps } from '@tanstack/react-router'

import './Entries.css'

const WAYS: Array<{ to: LinkProps['to']; title: string; desc: string }> = [
  {
    to: '/products',
    title: 'Le catalogue',
    desc: 'Les produits et leurs formules, en accès libre.',
  },
  {
    to: '/ingredients',
    title: 'Les ingrédients',
    desc: 'Chaque nom d’INCI, expliqué par son rôle dans une formule.',
  },
  {
    to: '/blog',
    title: 'Les articles',
    desc: 'Guides et lectures de formule, sans encart sponsorisé.',
  },
]

export function Entries() {
  return (
    <section className="aur-entries">
      <div className="aur-letter">
        <h2 className="aur-mk-h2">Entrer sans compte</h2>
        <ul role="list" className="aur-entries__list">
          {WAYS.map((w) => (
            <li key={w.title}>
              <Link to={w.to} className="aur-entries__link">
                <span className="aur-entries__title">{w.title}</span>
                <span className="aur-entries__desc">{w.desc}</span>
              </Link>
            </li>
          ))}
        </ul>
      </div>
    </section>
  )
}
