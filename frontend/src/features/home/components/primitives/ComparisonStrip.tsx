import './ComparisonStrip.css'

export type CompareRow = {
  key: string
  a: string
  b: string
  // 'ok' = green, 'warn' = accent, default = neutral.
  aHint?: 'ok' | 'warn'
  bHint?: 'ok' | 'warn'
}

export type CompareSideMeta = {
  label?: string
  name: string
}

export type ComparisonStripProps = {
  left: CompareSideMeta
  right: CompareSideMeta
  rows: CompareRow[]
  className?: string
}

export function ComparisonStrip({ left, right, rows, className }: ComparisonStripProps) {
  return (
    <div className={['aur-compare', className].filter(Boolean).join(' ')}>
      <div className="aur-compare__col aur-compare__col--a">
        <div className="aur-compare__label">{left.label ?? 'Produit A'}</div>
        <div className="aur-compare__name">{left.name}</div>
        {rows.map((r, i) => (
          <div className="aur-compare__row" key={`${r.key}-a-${i}`}>
            <span className="aur-compare__row-key">{r.key}</span>
            <span
              className={`aur-compare__row-val${r.aHint ? ` aur-compare__row-val--${r.aHint}` : ''}`}
            >
              {r.a}
            </span>
          </div>
        ))}
      </div>
      <div className="aur-compare__col aur-compare__col--b">
        <div className="aur-compare__label">{right.label ?? 'Produit B'}</div>
        <div className="aur-compare__name">{right.name}</div>
        {rows.map((r, i) => (
          <div className="aur-compare__row" key={`${r.key}-b-${i}`}>
            <span className="aur-compare__row-key">{r.key}</span>
            <span
              className={`aur-compare__row-val${r.bHint ? ` aur-compare__row-val--${r.bHint}` : ''}`}
            >
              {r.b}
            </span>
          </div>
        ))}
      </div>
    </div>
  )
}
