import { useState } from 'react'

import collectionPreview from '../../../../assets/hero/preview-collection.webp'
import formulaPreview from '../../../../assets/hero/preview-formula.webp'
import { useDemo } from '../../../../lib/queries/auth'
import { HeroShell } from './HeroShell'

export function HeroBase() {
  const demo = useDemo()
  // Keep spinning through the demo POST and the full-page hand-off below.
  const [redirecting, setRedirecting] = useState(false)

  // Primary CTA delivers value before commitment: one-click demo seeds a
  // populated collection, then the in-app banner offers to keep it via signup.
  // Demo success flips auth, which unmounts this marketing hero and drops any
  // SPA navigate; a hard load reliably lands on the auth-gated /collection where
  // the "keep your data" signup banner lives.
  const startDemo = () =>
    demo.mutate(undefined, {
      onSuccess: () => {
        setRedirecting(true)
        window.location.assign('/collection')
      },
    })

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
      primary={{
        label: 'Commencer ma collection',
        onClick: startDemo,
        loading: demo.isPending || redirecting,
      }}
      secondary={{ label: 'Voir les produits', to: '/products' }}
      meta={['Indépendant', 'Sans publicité', 'Sans recommandation sponsorisée']}
      note={
        <>
          « Je l’ai construit pour arrêter de perdre le fil de ma propre routine. »
          <cite className="aur-hero__note-cite">Mathieu, fondateur d’Aurore</cite>
        </>
      }
    >
      <div className="aur-hero-shots">
        <figure className="aur-hero-shot aur-hero-shot--primary">
          <img
            src={collectionPreview}
            width={1120}
            height={673}
            loading="eager"
            decoding="async"
            alt="La collection dans Aurore : chaque produit rangé par état — en stock, wishlist, garde un œil — avec une note personnelle."
          />
        </figure>
        <figure className="aur-hero-shot aur-hero-shot--secondary">
          <img
            src={formulaPreview}
            width={900}
            height={541}
            loading="eager"
            decoding="async"
            alt="Une fiche produit dans Aurore : la formule lue calmement, chaque ingrédient expliqué sans verdict."
          />
        </figure>
      </div>
    </HeroShell>
  )
}
