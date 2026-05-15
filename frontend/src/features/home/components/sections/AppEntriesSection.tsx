import { Link } from '@tanstack/react-router'
import { FlaskConical, GitCompare, Layers, MessageCircle, Newspaper, Package } from 'lucide-react'

import { Container, SectionHead } from './Section'
import './AppEntriesSection.css'

type Entry = {
  id: string
  to?: string
  href?: string
  icon: React.ReactNode
  title: string
  desc: string
  exampleLabel: string
  example: string
  cta: string
  badge?: string
  wip?: boolean
}

const ENTRIES: Entry[] = [
  {
    id: 'collection',
    to: '/collection',
    icon: <Layers size={20} />,
    title: 'Collection',
    desc: 'Le centre de décision: vos produits, leurs états, et pourquoi vous les gardez ou les écartez.',
    exampleLabel: 'Exemple',
    example: '48 Considering · 19 Wishlist · 22 Owned · 11 Rejected',
    cta: 'Ouvrir ma collection',
  },
  {
    id: 'products',
    to: '/products',
    icon: <Package size={20} />,
    title: 'Produits',
    desc: 'Explorer les candidats: composition, contexte de formule, retours liés aux décisions.',
    exampleLabel: 'Tag actif',
    example: 'Sans parfum × Texture légère',
    cta: 'Parcourir le catalogue',
  },
  {
    id: 'ingredients',
    to: '/ingredients',
    icon: <FlaskConical size={20} />,
    title: 'Ingrédients',
    desc: 'Repères pour lire les formules des produits. Les fiches expliquent, elles ne décident pas à votre place.',
    exampleLabel: 'Fiche INCI',
    example: 'Niacinamide — repères + produits liés',
    cta: 'Explorer le wiki',
  },
  {
    id: 'compare',
    to: '/compare',
    icon: <GitCompare size={20} />,
    title: 'Comparatif',
    desc: 'Deux ou trois candidats côte à côte: groupes de formule, notes perso, écarts utiles à la décision.',
    exampleLabel: 'Comparaison récente',
    example: 'BHA 2 % vs Effaclar Duo+',
    cta: 'Lancer un comparatif',
    badge: 'Bientôt',
    wip: true,
  },
  {
    id: 'articles',
    to: '/blog',
    icon: <Newspaper size={20} />,
    title: 'Articles',
    desc: 'Guides ingrédients, lectures de formule, comparatifs de marques. Sans encart sponsorisé.',
    exampleLabel: 'Dernier article',
    example: "Comprendre le pH d'un soin acide",
    cta: 'Lire les articles',
  },
  {
    id: 'discussions',
    to: '/blog',
    icon: <MessageCircle size={20} />,
    title: 'Discussions',
    desc: "Échanges calmes autour d'un produit et du raisonnement qui mène à une décision.",
    exampleLabel: 'Fil actif',
    example: '« Pourquoi je l’ai mis en Rejected » · 23 réponses',
    cta: 'Voir les discussions',
  },
]

/**
 * Section 03 — Entrer dans l'app.
 * 6 cartes claires, focusables au clavier, 1 exemple concret par carte.
 * WIP s'affiche en grisé avec un badge "Bientôt" — toujours focusable.
 */
export function AppEntriesSection() {
  return (
    <section className="aur-section aur-section--sunken" id="entrees">
      <Container>
        <SectionHead
          num="03"
          eyebrow="Entrer dans l'app"
          title={
            <>
              Six entrées, <em>une seule logique</em>.
            </>
          }
          lede="Chaque entrée ramène au même objectif: avancer vers une décision produit claire et ne pas perdre le raisonnement."
        />

        <div className="aur-entries">
          {ENTRIES.map((e) => {
            const inner = (
              <>
                {e.badge ? <span className="aur-entry__badge">{e.badge}</span> : null}
                <span className="aur-entry__icon">{e.icon}</span>
                <h3 className="aur-entry__title">{e.title}</h3>
                <p className="aur-entry__desc">{e.desc}</p>
                <div className="aur-entry__example">
                  <span className="aur-entry__example-label">{e.exampleLabel}</span>
                  <span className="aur-entry__example-text">{e.example}</span>
                </div>
                <span className="aur-entry__cta">{e.cta}</span>
              </>
            )
            const cls = `aur-entry${e.wip ? ' aur-entry--wip' : ''}`
            if (e.wip || !e.to) {
              return (
                <div key={e.id} className={cls} aria-disabled={e.wip || undefined}>
                  {inner}
                </div>
              )
            }
            return (
              <Link key={e.id} to={e.to as never} className={cls}>
                {inner}
              </Link>
            )
          })}
        </div>
      </Container>
    </section>
  )
}
