import { Button } from '../../../../component/Button/Button'
import './FounderNote.css'

type Props = {
  onStartDemo: () => void
  demoPending: boolean
}

export function FounderNote({ onStartDemo, demoPending }: Props) {
  return (
    <section className="aur-founder">
      <div className="aur-letter">
        <p className="aur-founder__text">
          Aurore est construite par une personne, pas par une plateforme. Je l’ai commencée pour
          arrêter de perdre le fil de ma propre routine — et je la garde sans publicité, sans
          investisseurs, sans données revendues.
        </p>
        <p className="aur-founder__sign">— Mathieu</p>
        <div className="aur-founder__try">
          <Button variant="primary" size="lg" onClick={onStartDemo} loading={demoPending}>
            Créer un compte de démo
          </Button>
        </div>
      </div>
    </section>
  )
}
