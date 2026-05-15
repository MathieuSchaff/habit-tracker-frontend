import { CosmeticObject, Tag } from '../primitives'
import { Container, SectionHead } from './Section'
import './PillarsSection.css'

/**
 * Section 02 — Trois piliers : Collectionner / Comprendre / Comparer.
 * Pas une app d'habitudes : un endroit où ce que vous avez, ce que vous lisez
 * et ce que vous comparez se retrouve dans le même geste.
 */
export function PillarsSection() {
  const pillars = [
    {
      index: '02.1',
      titleHead: 'Collect',
      titleEm: 'er',
      desc: 'Tous vos produits au même endroit, avec un état clair : Wishlist, En cours, Saint Graal, À éviter.',
      viz: (
        <div className="aur-objs-row" style={{ gap: 'var(--space-3)' }}>
          <CosmeticObject kind="jar" />
          <CosmeticObject kind="bottle" />
          <CosmeticObject kind="dropper" />
        </div>
      ),
      items: ['États produit', 'Notes datées', 'Raisons mémorisées'],
    },
    {
      index: '02.2',
      titleHead: 'Compr',
      titleEm: 'endre',
      desc: 'Les ingrédients servent à expliquer un produit candidat: rôle dans la formule, repères de lecture, points à suivre selon vos préférences.',
      viz: (
        <div className="aur-pillar__viz-tags">
          <Tag variant="active">Niacinamide</Tag>
          <div className="aur-pillar__viz-tagrow">
            <Tag variant="outline">Hydratation</Tag>
            <Tag variant="warn">À contextualiser</Tag>
          </div>
        </div>
      ),
      items: ['Lecture INCI guidée', 'Repères de lecture', 'Pas de claim médical'],
    },
    {
      index: '02.3',
      titleHead: 'Déc',
      titleEm: 'ider',
      desc: 'Comparer les candidats, choisir un état, garder la raison. La prochaine fois, votre raisonnement est déjà là.',
      viz: (
        <div className="aur-pillar__viz-compare">
          <CosmeticObject kind="spray" />
          <div className="aur-pillar__viz-divider" />
          <CosmeticObject kind="bottle" />
        </div>
      ),
      items: ['Comparatif côte à côte', 'Décision documentée', 'Historique retrouvable'],
    },
  ]

  return (
    <section className="aur-section" id="piliers">
      <Container>
        <SectionHead
          num="02"
          eyebrow="Trois piliers"
          title={
            <>
              Une base skincare faite pour&nbsp;<em>décider</em>.
            </>
          }
          lede="Pas un score. Pas un verdict universel. Un espace product-first pour collecter, comparer, décider et retrouver pourquoi."
        />

        <div className="aur-pillars">
          {pillars.map((p) => (
            <article className="aur-pillar" key={p.index}>
              <div className="aur-pillar__viz" aria-hidden="true">
                {p.viz}
              </div>
              <div className="aur-pillar__index">{p.index}</div>
              <h3 className="aur-pillar__title">
                {p.titleHead}
                <em>{p.titleEm}</em>
              </h3>
              <p className="aur-pillar__desc">{p.desc}</p>
              <ul className="aur-pillar__list">
                {p.items.map((it) => (
                  <li className="aur-pillar__list-item" key={it}>
                    {it}
                  </li>
                ))}
              </ul>
            </article>
          ))}
        </div>
      </Container>
    </section>
  )
}
