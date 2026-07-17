import { Link } from '@tanstack/react-router'

import { Button } from '../../../../component/Button/Button'
import { AuroreBrandMark } from '../primitives/AuroreBrandMark'
import './Opening.css'

type Props = {
  onStartDemo: () => void
  demoPending: boolean
}

export function Opening({ onStartDemo, demoPending }: Props) {
  return (
    <section className="aur-opening">
      <div className="aur-letter">
        <p className="aur-opening__brand">
          <AuroreBrandMark size={24} />
          <span>Aurore</span>
        </p>
        <h1 className="aur-opening__title">Le carnet skincare qui retient pourquoi.</h1>
        <p className="aur-opening__lede">
          Vos produits, vos notes datées et les raisons derrière chaque choix, gardés au même
          endroit. Pour ne plus refaire trois fois la même recherche.
        </p>
        <div className="aur-opening__try">
          <Button variant="primary" size="lg" onClick={onStartDemo} loading={demoPending}>
            Créer un compte de démo
          </Button>
          <p className="aur-opening__try-hint">
            Un clic, sans email. Une collection déjà remplie pour explorer les fonctionnalités.
          </p>
        </div>
        <p className="aur-opening__alt">
          Ou commencez par{' '}
          <Link to="/products" className="aur-opening__alt-link">
            parcourir le catalogue
          </Link>
          , en accès libre.
        </p>
      </div>
    </section>
  )
}
