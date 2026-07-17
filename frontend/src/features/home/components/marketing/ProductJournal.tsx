import { Fragment } from 'react'

import './ProductJournal.css'

// Real INCI of The Ordinary Niacinamide 10% + Zinc 1% — the sheet must read
// as a lived page, not lorem ipsum.
const INCI: Array<{ name: string; marked?: boolean }> = [
  { name: 'Aqua (Water)' },
  { name: 'Niacinamide', marked: true },
  { name: 'Pentylene Glycol' },
  { name: 'Zinc PCA' },
  { name: 'Dimethyl Isosorbide' },
  { name: 'Tamarindus Indica Seed Gum' },
  { name: 'Xanthan Gum' },
  { name: 'Isoceteth-20' },
  { name: 'Ethoxydiglycol' },
  { name: 'Phenoxyethanol', marked: true },
  { name: 'Chlorphenesin' },
]

const MARGIN_NOTES = [
  {
    term: 'Niacinamide',
    text: 'souvent mise en avant pour la régulation du sébum. Un repère de lecture, pas une promesse.',
  },
  {
    term: 'Phenoxyethanol',
    text: 'système de conservation, aide la formule à rester stable. À noter, pas une alerte.',
  },
]

const JOURNAL = [
  { date: '3 juin', text: 'Picotements légers les premiers soirs. Je passe à un soir sur deux.' },
  { date: '21 juin', text: 'Plus rien à signaler. Passe bien sous la crème du matin.' },
]

export function ProductJournal() {
  return (
    <section className="aur-journal">
      <div className="aur-letter">
        <h2 className="aur-mk-h2">Une page du carnet, telle quelle</h2>
        <p className="aur-mk-lede">
          Un sérum ajouté fin mai : la formule lue calmement, deux notes datées, et la raison qu’on
          retrouve six mois plus tard.
        </p>
      </div>

      <div className="aur-journal__wrap">
        <article className="aur-journal__sheet" aria-label="Exemple de fiche produit dans Aurore">
          <header className="aur-journal__head">
            <div>
              <p className="aur-journal__brand">The Ordinary</p>
              <p className="aur-journal__name">Niacinamide 10 % + Zinc 1 %</p>
              <p className="aur-journal__meta">Sérum · ajouté le 28 mai</p>
            </div>
            <span className="aur-journal__status">
              <span className="aur-journal__status-dot" aria-hidden="true" />
              En stock
            </span>
          </header>

          <div className="aur-journal__formula">
            <div>
              <p className="aur-journal__label">Formule — collée depuis le packaging</p>
              <p className="aur-journal__inci">
                {INCI.map((ing, i) => (
                  <Fragment key={ing.name}>
                    {i > 0 ? ', ' : ''}
                    {ing.marked ? <mark className="aur-journal__ing">{ing.name}</mark> : ing.name}
                  </Fragment>
                ))}
              </p>
            </div>
            <aside className="aur-journal__margin" aria-label="Repères de lecture">
              {MARGIN_NOTES.map((n) => (
                <p key={n.term} className="aur-journal__annotation">
                  <strong>{n.term}</strong> — {n.text}
                </p>
              ))}
            </aside>
          </div>

          <ul role="list" className="aur-journal__entries">
            {JOURNAL.map((e) => (
              <li key={e.date} className="aur-journal__entry">
                <span className="aur-journal__date">{e.date}</span>
                <span className="aur-journal__note">{e.text}</span>
              </li>
            ))}
          </ul>

          <p className="aur-journal__kept">
            <span className="aur-journal__kept-label">Retenu</span>
            <span>
              Routine du soir, un jour sur deux. Moins de brillance en fin de journée — chez moi.
            </span>
          </p>
        </article>
      </div>
    </section>
  )
}
