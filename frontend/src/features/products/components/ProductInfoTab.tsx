import { useQuery, useSuspenseQuery } from '@tanstack/react-query'
import { getRouteApi, Link } from '@tanstack/react-router'
import { ExternalLink, FlaskConical } from 'lucide-react'
import { useMemo } from 'react'
import Markdown from 'react-markdown'

import { FormMessage } from '@/component/Feedback/ui/FormMessage/FormMessage'
import { RichText } from '@/component/Typography/RichText/RichText'
import { SectionHeader } from '@/component/Typography/SectionHeader/SectionHeader'
import { productQueries } from '../../../lib/queries/products'
import { profileQueries } from '../../../lib/queries/profile'
import { useAuthStore } from '../../../store/auth'
import './ProductInfoTab.css'

const route = getRouteApi('/products/$slug/')

function formatConcentration(
  value: string | null,
  unit: string | null,
  per: string | null
): string | null {
  if (!value) return null
  let result = value
  if (unit) result += ` ${unit}`
  if (per) result += ` / ${per}`
  return result
}

export function ProductInfoTab() {
  const { slug } = route.useParams()
  const { data: product } = useSuspenseQuery(productQueries.bySlug(slug))
  const hasIngredients = product.ingredients && product.ingredients.length > 0

  const user = useAuthStore((s) => s.user)

  const { data: productTagsData } = useQuery({
    ...productQueries.tags(product.id),
    enabled: !!user,
  })

  const { data: dermoProfile } = useQuery({
    ...profileQueries.dermo(),
    enabled: !!user,
  })

  const warnings = useMemo(() => {
    if (!productTagsData || !dermoProfile) return []
    const profileSlugs = new Set<string>([
      ...(dermoProfile.skinTypes ?? []),
      ...dermoProfile.skinConcerns,
    ])
    return productTagsData.filter((t) => t.relevance === 'avoid' && profileSlugs.has(t.tagSlug))
  }, [productTagsData, dermoProfile])

  return (
    <>
      {warnings.length > 0 && (
        <FormMessage variant="warning">
          Ce produit peut ne pas convenir à votre profil cutané.
        </FormMessage>
      )}
      <div className="product-section">
        <SectionHeader title="Informations" variant="primary" />
        <dl className="product-details">
          {product.totalAmount != null && (
            <div className="product-detail">
              <dt className="product-detail__label">Contenance</dt>
              <dd className="product-detail__value">
                {product.totalAmount} {product.amountUnit ?? product.unit}
              </dd>
            </div>
          )}
          {product.inci && (
            <div className="product-detail product-detail--full">
              <dt className="product-detail__label">INCI</dt>
              <dd className="product-detail__value product-detail__value--inci">{product.inci}</dd>
            </div>
          )}
        </dl>
      </div>

      {product.description && (
        <div className="product-info-section">
          <SectionHeader title="Description" variant="primary" />
          <RichText className="product-notes">
            <Markdown>{product.description}</Markdown>
          </RichText>
        </div>
      )}

      {hasIngredients && (
        <div className="product-section">
          <SectionHeader title="Ingrédients" count={product.ingredients.length} variant="primary" />
          <ul className="ingredient-list">
            {product.ingredients.map((ing) => {
              const concentration = formatConcentration(
                ing.concentrationValue,
                ing.concentrationUnit,
                ing.concentrationPer
              )
              return (
                <li key={ing.ingredientName} className="ingredient-item">
                  <div className="ingredient-item__icon" aria-hidden="true">
                    <FlaskConical size={14} />
                  </div>
                  <div className="ingredient-item__body">
                    <div className="ingredient-item__top">
                      <Link
                        to="/ingredients/$slug"
                        params={{ slug: ing.ingredientSlug }}
                        className="ingredient-item__name"
                      >
                        {ing.ingredientName}
                      </Link>
                      {concentration && (
                        <span className="ingredient-item__concentration">{concentration}</span>
                      )}
                    </div>
                    <div className="ingredient-item__meta">
                      {ing.ingredientCategory && (
                        <span className="ingredient-item__category">{ing.ingredientCategory}</span>
                      )}
                      {ing.notes && <span className="ingredient-item__notes">{ing.notes}</span>}
                    </div>
                  </div>
                </li>
              )
            })}
          </ul>
        </div>
      )}

      {product.notes && (
        <div className="product-section">
          <SectionHeader title="Notes" variant="primary" />
          <div className="product-notes">{product.notes}</div>
        </div>
      )}

      {product.url && (
        <div className="product-section">
          <a href={product.url} target="_blank" rel="noopener noreferrer" className="product-link">
            <ExternalLink size={16} aria-hidden="true" />
            Voir le produit
          </a>
        </div>
      )}
    </>
  )
}
