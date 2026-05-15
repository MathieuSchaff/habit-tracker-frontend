import { IngredientCard, ProductCard, ProfileCard } from '../primitives'
import { HeroShell } from './HeroShell'

/**
 * Hero A — "Base personnelle".
 * Positionnement clair et direct. Visuel : stack ProductCard / IngredientCard / ProfileCard.
 *
 * À configurer pour le repo : remplacer le `to` du primary par votre route signup.
 */
export function HeroBase() {
  return (
    <HeroShell
      badge="Bêta ouverte"
      title={
        <>
          <span className="aur-hero__title-line">Votre skincare,</span>
          <span className="aur-hero__title-line">
            <em>au même endroit.</em>
          </span>
        </>
      }
      subtitle="Aurore garde vos produits, vos notes et les raisons derrière chaque choix, pour que vous puissiez décider sans recommencer la recherche à chaque fois."
      primary={{ label: 'Commencer ma collection', to: '/collection' }}
      secondary={{ label: 'Voir les produits', to: '/products' }}
      meta={['Indépendant', 'Sans publicité', 'Sans recommandation sponsorisée']}
    >
      <div className="aur-hero-stack">
        <div className="aur-hero-stack__sheet" aria-hidden="true" />
        <div className="aur-hero-stack__primary">
          <ProductCard
            brand="The Ordinary"
            name="Niacinamide 10 % + Zinc 1 %"
            type="Sérum visage · 30 ml"
            status="in-stock"
            statusLabel="En cours"
            inci="Aqua, Niacinamide, Pentylene Glycol, Zinc PCA, Dimethyl Isosorbide, Tamarindus Indica…"
            highlight={['Niacinamide', 'Zinc PCA']}
            stats={[
              { label: 'Dernière note', value: 'Hydratation OK, parfum léger' },
              { label: 'Décision', value: 'Comparer avant achat' },
            ]}
          />
        </div>
        <div className="aur-hero-stack__secondary">
          <IngredientCard
            name="Niacinamide"
            inci="Pyridine-3-carboxamide"
            rating="A"
            ratingLabel="profil"
            roles={[
              { label: 'Hydratation', variant: 'active' },
              { label: 'À contextualiser', variant: 'warn' },
            ]}
            rows={[{ key: 'Origine', value: 'Vitamine B3' }]}
          />
        </div>
        <div className="aur-hero-stack__tertiary">
          <ProfileCard
            initials="L"
            name="Mon profil peau"
            meta="Objectifs · Rougeurs · Taches · Fermeté"
            rows={[
              { key: 'Contrainte', val: 'Sensibilité cutanée' },
              { key: 'Repères suivis', val: 'Niacinamide, Bakuchiol' },
            ]}
          />
        </div>
      </div>
    </HeroShell>
  )
}
