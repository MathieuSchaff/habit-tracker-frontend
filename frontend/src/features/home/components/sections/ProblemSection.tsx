import { Container, SectionEyebrow } from './Section'
import './ProblemSection.css'

const PROBLEMS = [
  { num: '01', text: '12 onglets ouverts pour décoder une formule.' },
  { num: '02', text: 'INCI copiée-collée dans Notes.app, jamais relue.' },
  { num: '03', text: "Analyse d'ingrédients faite avec une IA, perdue le lendemain." },
  { num: '04', text: 'Fichiers markdown abandonnés au fond du Drive.' },
  { num: '05', text: 'Avis contradictoires sur le même produit, partout.' },
  { num: '06', text: "Wishlist éparpillée entre captures d'écran et favoris.", solved: true },
]

export function ProblemSection() {
  return (
    <section className="aur-section aur-section--sunken" id="probleme">
      <Container>
        <div className="aur-problem">
          <div className="aur-stack aur-gap-4">
            <SectionEyebrow num="01">État des lieux</SectionEyebrow>
            <h2 className="aur-problem__quote">
              Comprendre une formule ne devrait pas demander une demi&#8209;heure et&nbsp;
              <em>douze onglets</em>.
            </h2>
            <p className="aur-section-lede">
              Le marché skincare empile des promesses. Les outils existants vendent des produits ou
              laissent perdre le raisonnement. Aurore part du principe inverse: vous comparez, vous
              décidez, vous retrouvez pourquoi.
            </p>
            <p className="aur-problem__attribution">
              — Ce que la plupart des gens font, et qui ne marche pas.
            </p>
          </div>

          <ol className="aur-problem__list">
            {PROBLEMS.map((it) => (
              <li
                key={it.num}
                className={`aur-problem__item${it.solved ? ' aur-problem__item--solved' : ''}`}
              >
                <span className="aur-problem__item-num">{it.num}</span>
                <span className="aur-problem__item-text">{it.text}</span>
                {it.solved ? (
                  <span className="aur-problem__item-flag">↳ Centralisé dans Aurore</span>
                ) : null}
              </li>
            ))}
          </ol>
        </div>
      </Container>
    </section>
  )
}
