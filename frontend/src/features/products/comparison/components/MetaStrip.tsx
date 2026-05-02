import type { EnrichedComparisonProduct } from '@habit-tracker/shared'

type Props = { products: EnrichedComparisonProduct[] }

const eur = new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR' })

function formatPricePer(p: EnrichedComparisonProduct): string {
  if (!p.pricePer) return '—'
  return `${eur.format(p.pricePer.cents / 100)} / ${p.pricePer.unit}`
}

export function MetaStrip({ products }: Props) {
  const allUnits = new Set(
    products.map((p) => p.pricePer?.unit).filter((u): u is NonNullable<typeof u> => Boolean(u))
  )
  const mixed = allUnits.size > 1
  return (
    <ul>
      {products.map((p) => (
        <li key={p.id}>
          <strong>{p.brand}</strong> — {p.name}
          <p>{p.kind}</p>
          <p>{p.totalAmount && p.amountUnit ? `${p.totalAmount} ${p.amountUnit}` : '—'}</p>
          <p>{mixed ? 'Prix non comparable' : formatPricePer(p)}</p>
          <ul>
            {p.tags
              .filter((t) =>
                ['product_type_v2', 'texture', 'routine_moment', 'skin_type'].includes(t.tagType)
              )
              .map((t) => (
                <li key={t.slug}>{t.slug}</li>
              ))}
          </ul>
        </li>
      ))}
    </ul>
  )
}
