import { Eye, Focus, Leaf, Shield } from 'lucide-react'

import { Container, SectionHead } from './Section'
import './PhilosophySection.css'

const PRINCIPLES = [
  {
    icon: <Eye size={18} />,
    title: 'Décision, pas verdict.',
    desc: 'Aurore n’attribue pas de score universel. Elle vous aide à documenter une décision personnelle et à la retrouver.',
  },
  {
    icon: <Focus size={18} />,
    title: 'Une chose à la fois.',
    desc: "Interface sobre, hiérarchie nette, pas de notification qui vibre. Lire une fiche, c'est lire une fiche.",
  },
  {
    icon: <Shield size={18} />,
    title: 'Vos données, à vous.',
    desc: "Pas de revente, pas d'algorithme publicitaire, pas de recommandation sponsorisée. Aucun conflit d'intérêts.",
  },
  {
    icon: <Leaf size={18} />,
    title: 'Sérieux, pas médical.',
    desc: 'Aurore propose une lecture de formule, pas une recommandation clinique. Pour vos questions médicales, consultez un professionnel.',
  },
]

export function PhilosophySection() {
  return (
    <section className="aur-section aur-section--deep" id="philosophie">
      <Container>
        <SectionHead
          num="05"
          eyebrow="Ce qu'on n'est pas"
          title={
            <>
              Un outil indépendant.
              <br />
              <em className="aur-philo__title-em">Quatre principes,</em> tenus.
            </>
          }
        />

        <div className="aur-philo">
          {PRINCIPLES.map((it) => (
            <article className="aur-philo__card" key={it.title}>
              <span className="aur-philo__icon">{it.icon}</span>
              <h3 className="aur-philo__title">{it.title}</h3>
              <p className="aur-philo__desc">{it.desc}</p>
            </article>
          ))}
        </div>
      </Container>
    </section>
  )
}
