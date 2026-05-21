import './ComparisonHero.css'

type Props = {
  reference?: string
  count: number
  name?: string | null
}

export function ComparisonHero({ reference, count, name }: Props) {
  const ref = reference ?? `N° ${String(count).padStart(2, '0')}`

  return (
    <header className="cmp-hero">
      <p className="cmp-hero__rule">
        <span>Cabinet d'analyse</span>
        <span aria-hidden="true">·</span>
        <span>Comparaison {ref}</span>
      </p>
      <h1 className="cmp-hero__title">
        {name ? (
          name
        ) : (
          <>
            {count} formules, <em>une lecture.</em>
          </>
        )}
      </h1>
      <p className="cmp-hero__sub">
        Examen croisé des compositions INCI et de vos notes. Une lecture côte à côte — pour
        comprendre les nuances, pas pour désigner un gagnant.
      </p>
    </header>
  )
}
