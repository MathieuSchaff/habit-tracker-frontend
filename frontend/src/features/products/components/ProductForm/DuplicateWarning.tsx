import { Link } from '@tanstack/react-router'

type SimilarProduct = { id: string; slug: string; name: string; brand: string }

export function DuplicateWarning({
  mode,
  products,
}: {
  mode: 'create' | 'edit'
  products: SimilarProduct[] | undefined
}) {
  if (mode !== 'create' || !products || products.length === 0) return null
  return (
    <div className="product-edit-form__duplicate-warning" role="alert">
      <p>
        {products.length === 1
          ? 'Un produit similaire existe déjà :'
          : 'Des produits similaires existent déjà :'}
      </p>
      <ul>
        {products.map((p) => (
          <li key={p.id}>
            <Link to="/products/$slug" params={{ slug: p.slug }}>
              {p.name} — {p.brand}
            </Link>
          </li>
        ))}
      </ul>
    </div>
  )
}
