import { Link } from '@tanstack/react-router'
import { ArrowRight } from 'lucide-react'

import { AuroreBrandMark } from '../primitives/AuroreBrandMark'
import { Container } from './Section'
import './FinalCTASection.css'

/**
 * Section finale — invitation à commencer.
 * 2 CTAs : créer un compte / explorer sans compte.
 */
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
            <Link to="/collection" className="aur-btn aur-btn--primary aur-btn--lg">
              Commencer ma collection <ArrowRight size={16} />
            </Link>
            <Link to="/products" className="aur-btn aur-btn--ghost aur-btn--lg">
              Explorer sans compte
            </Link>
          </div>
        </div>
      </Container>
    </section>
  )
}
