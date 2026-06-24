import { ArrowRight } from 'lucide-react'

import { ButtonLink } from '../../../../component/Button/Button'
import { useAuthStore } from '../../../../store/auth'
import { AuroreBrandMark } from '../primitives/AuroreBrandMark'
import { Container } from './Section'
import './FinalCTASection.css'

export function FinalCTASection() {
  // "Sans compte" framing only makes sense for prospects; signed-in users just explore.
  const isAuthenticated = useAuthStore((s) => !!s.accessToken)
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
              {isAuthenticated ? 'Explorer les produits' : 'Explorer sans compte'}
            </ButtonLink>
          </div>
        </div>
      </Container>
    </section>
  )
}
