import { ComparisonStrip, Tag } from '../primitives'
import { Container, SectionHead } from './Section'
import './FlowSection.css'

type Step = {
  num: string
  title: string
  desc: string
  viz: React.ReactNode
}

const STEPS: Step[] = [
  {
    num: '01',
    title: "J'ajoute un produit candidat.",
    desc: "Marque, nom, type, puis état initial: Considering. La fiche est prête en moins d'une minute.",
    viz: (
      <div className="aur-flow__viz">
        <div className="aur-flow__viz-row">
          <span style={{ color: 'var(--color-accent)' }}>+</span>
          <span>The Ordinary — Niacinamide 10 % + Zinc 1 %</span>
        </div>
        <div className="aur-flow__viz-row">
          <span className="aur-flow__viz-tag">Sérum</span>
          <span className="aur-flow__viz-tag">30 ml</span>
        </div>
      </div>
    ),
  },
  {
    num: '02',
    title: 'Je colle la liste INCI depuis le packaging.',
    desc: "Aurore relie les ingrédients à des repères de lecture pour m'aider à comprendre le produit, pas à donner un verdict.",
    viz: (
      <div className="aur-flow__viz">
        Aqua, <mark>Niacinamide</mark>, Pentylene Glycol, <mark>Zinc PCA</mark>, Dimethyl
        Isosorbide, Tamarindus Indica Seed Gum…
      </div>
    ),
  },
  {
    num: '03',
    title: "Je compare et j'ajuste l'état.",
    desc: 'Considering, Wishlist, Owned ou Rejected. La décision reste liée à mes notes et à la formule.',
    viz: (
      <div className="aur-flow__viz aur-flow__viz--tags">
        <Tag variant="active">Considering</Tag>
        <Tag variant="outline">Wishlist</Tag>
        <Tag variant="warn">Rejected</Tag>
        <Tag>Picotements semaine 1</Tag>
        <Tag>Comparer avec sérum B</Tag>
      </div>
    ),
  },
  {
    num: '04',
    title: 'Je le compare à une autre option.',
    desc: 'Côte à côte. Mêmes groupes de formule, différences clés, notes personnelles associées.',
    viz: (
      <ComparisonStrip
        left={{ label: 'Avant', name: 'Anua Niacinamide' }}
        right={{ label: 'Maintenant', name: 'The Ordinary' }}
        rows={[
          { key: 'Niacinamide', a: '10 %', b: '10 %' },
          { key: 'Parfum', a: 'Non', b: 'Non', aHint: 'ok', bHint: 'ok' },
          { key: 'Prix / ml', a: '0,38 €', b: '0,21 €', bHint: 'ok' },
        ]}
      />
    ),
  },
  {
    num: '05',
    title: 'Je garde la raison de ma décision.',
    desc: "Une note courte, une date, un état. Quand le produit revient dans ma recherche, je n'ai plus à repartir de zéro.",
    viz: (
      <div className="aur-flow__viz">
        <div className="aur-flow__viz-row">
          <span className="aur-flow__viz-tag aur-flow__viz-tag--holy">Rejected</span>
          <span style={{ color: 'var(--text-muted)' }}>— 21 juin 2026</span>
        </div>
        <span style={{ color: 'var(--text-primary)' }}>
          « Bonne texture, mais rougeurs après 4 jours. Pause et réévaluation plus tard. »
        </span>
      </div>
    ),
  },
]

/**
 * Section 04 — Un usage concret.
 * 5 étapes — pas une démo magique : la chose réelle, telle qu'elle existe.
 */
export function FlowSection() {
  return (
    <section className="aur-section" id="usage">
      <Container>
        <SectionHead
          num="04"
          eyebrow="Un usage concret"
          title={
            <>
              De la recherche à la décision,&nbsp;<em>cinq étapes</em>.
            </>
          }
          lede="Voici le flux réel dans Aurore: collecter un candidat, le lire, le comparer, décider, puis retrouver cette décision plus tard."
        />

        <ol className="aur-flow">
          {STEPS.map((s) => (
            <li className="aur-flow__step" key={s.num}>
              <span className="aur-flow__num">{s.num}</span>
              <div className="aur-flow__body">
                <div className="aur-flow__text">
                  <h3 className="aur-flow__title">{s.title}</h3>
                  <p className="aur-flow__desc">{s.desc}</p>
                </div>
                <div>{s.viz}</div>
              </div>
            </li>
          ))}
        </ol>
      </Container>
    </section>
  )
}
