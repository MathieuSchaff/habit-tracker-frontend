import './Refusals.css'

const REFUSALS = [
  {
    lead: 'Noter les produits.',
    text: 'Pas de score, pas de classement. Une formule s’explique, elle ne se résume pas à un chiffre.',
  },
  {
    lead: 'Vous faire peur.',
    text: 'Un ingrédient que vous suivez est un repère de lecture, jamais une alerte rouge.',
  },
  {
    lead: 'Vendre.',
    text: 'Aucune marque ne paie pour apparaître, aucun lien sponsorisé, aucune donnée revendue.',
  },
  {
    lead: 'Jouer au médecin.',
    text: 'Aurore lit des formules. Les questions de peau qui relèvent du médical reviennent à un professionnel.',
  },
]

export function Refusals() {
  return (
    <section className="aur-refusals">
      <div className="aur-letter">
        <h2 className="aur-mk-h2">Ce qu’Aurore ne fera pas</h2>
        <ul role="list" className="aur-refusals__list">
          {REFUSALS.map((r) => (
            <li key={r.lead} className="aur-refusals__item">
              <strong>{r.lead}</strong> {r.text}
            </li>
          ))}
        </ul>
      </div>
    </section>
  )
}
