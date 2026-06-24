import { ArrowRight } from 'lucide-react'

import { ButtonLink } from '../../../../component/Button/Button'
import { AuroreBrandMark } from '../primitives/AuroreBrandMark'
import { Container } from './Section'
import './FinalCTASection.css'

export function FinalCTASection() {
  return (
    <section className="aur-section">
      <Container>
        <div className="aur-final">
          <AuroreBrandMark size={56} />
          <h2 className="aur-final__title">
            Vos produits, vos décisions,&nbsp;<em>votre mémoire.</em>
          </h2>
          <p className="aur-final__lede">
            Aurore est en bêta ouverte. Ajoutez un premier produit, choisissez son état
            (Considering, Wishlist, Owned, Rejected), puis gardez la raison de ce choix.
          </p>
          <div className="aur-final__actions">
            <ButtonLink variant="primary" size="lg" to="/collection">
              Commencer ma collection <ArrowRight size={16} />
            </ButtonLink>
            <ButtonLink variant="outline" size="lg" to="/products">
              Explorer sans compte
            </ButtonLink>
          </div>
        </div>
      </Container>
    </section>
  )
}
