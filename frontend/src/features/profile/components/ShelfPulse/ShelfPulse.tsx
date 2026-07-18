import { useSuspenseQuery } from '@tanstack/react-query'
import { Link } from '@tanstack/react-router'
import { ArrowUpRight } from 'lucide-react'

import { CardTitle } from '@/component/Typography/CardTitle/CardTitle'
import { Overline } from '@/component/Typography/Overline/Overline'
import { profileQueries } from '@/lib/queries/profile'
import './ShelfPulse.css'

export function ShelfPulse() {
  const { data: stats } = useSuspenseQuery(profileQueries.stats())
  const total = stats.totalProducts ?? 0

  if (total === 0) {
    return (
      <section className="shelf-pulse" aria-labelledby="shelf-pulse-title">
        <div className="shelf-pulse__heading">
          <Overline>Sur votre étagère</Overline>
          <CardTitle id="shelf-pulse-title">Aucun produit pour le moment.</CardTitle>
          <p className="shelf-pulse__caption">
            Ajoutez un premier produit, puis Aurore vous aidera à retenir ce qu'il contient et
            comment il s'intègre à votre routine.
          </p>
        </div>
        <Link to="/collection" className="shelf-pulse__cta">
          <span>Voir l'étagère</span>
          <ArrowUpRight size={16} aria-hidden="true" />
        </Link>
      </section>
    )
  }

  return (
    <section className="shelf-pulse" aria-labelledby="shelf-pulse-title">
      <div className="shelf-pulse__heading">
        <Overline>Sur votre étagère</Overline>
        <CardTitle id="shelf-pulse-title">
          {total === 1 ? '1 produit' : `${total} produits`} sur votre étagère.
        </CardTitle>
        <p className="shelf-pulse__caption">
          Retrouvez vos formules, vos notes et vos décisions à un seul endroit.
        </p>
      </div>
      <Link to="/collection" className="shelf-pulse__cta">
        <span>Ouvrir ma collection</span>
        <ArrowUpRight size={16} aria-hidden="true" />
      </Link>
    </section>
  )
}
