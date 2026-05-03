import { useQuery, useSuspenseQuery } from '@tanstack/react-query'
import { getRouteApi, Link } from '@tanstack/react-router'
import { Check, Copy, ExternalLink, FlaskConical } from 'lucide-react'
import { lazy, Suspense, useCallback, useMemo } from 'react'

// Defer ~50KB gzip — description block is below the fold on first paint.
const Markdown = lazy(() => import('react-markdown'))

import { Button } from '@/component/Button/Button'
import { FormMessage } from '@/component/Feedback/ui/FormMessage/FormMessage'
import { RichText } from '@/component/Typography/RichText/RichText'
import { SectionHeader } from '@/component/Typography/SectionHeader/SectionHeader'
import { SKIN_CONCERN_LABELS, SKIN_TYPE_LABELS } from '@/constants/skin'
import { useCopyToClipboard } from '@/hooks/useCopyToClipboard'
import { productQueries } from '@/lib/queries/products'
import { profileQueries } from '@/lib/queries/profile'
import { useAuthStore } from '@/store/auth'
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

function profileLabel(slug: string): string {
  return (
    SKIN_TYPE_LABELS[slug as keyof typeof SKIN_TYPE_LABELS] ??
    SKIN_CONCERN_LABELS[slug as keyof typeof SKIN_CONCERN_LABELS] ??
    slug
  )
}

export function ProductInfoTab() {
  const { slug } = route.useParams()
  const { data: product } = useSuspenseQuery(productQueries.bySlug(slug))
  const hasIngredients = product.ingredients && product.ingredients.length > 0
  const { copied, copy } = useCopyToClipboard()

  const handleCopyIngredients = useCallback(() => {
    if (!product.ingredients?.length) return
    const text = product.ingredients
      .map((ing) => {
        const conc = formatConcentration(
          ing.concentrationValue,
          ing.concentrationUnit,
          ing.concentrationPer
        )
        return conc ? `${ing.ingredientName} (${conc})` : ing.ingredientName
      })
      .join(', ')
    void copy(text)
  }, [product.ingredients, copy])

  const user = useAuthStore((s) => s.user)

  const { data: dermoProfile } = useQuery({
    ...profileQueries.dermo(),
    enabled: !!user,
  })

  const warnings = useMemo(() => {
    if (!user || !dermoProfile) return []
    const profileSlugs = new Set<string>([
      ...(dermoProfile.skinTypes ?? []),
      ...dermoProfile.skinConcerns,
    ])
    return product.tags.filter((t) => t.relevance === 'avoid' && profileSlugs.has(t.tagSlug))
  }, [user, dermoProfile, product.tags])

  return (
    <>
      {warnings.length > 0 && (
        <FormMessage variant="warning">
          <strong>Peut ne pas convenir à votre profil cutané.</strong>{' '}
          <span>
            Concerne :{' '}
            {warnings.map((w, i) => (
              <span key={w.tagSlug}>
                {i > 0 && ', '}
                {profileLabel(w.tagSlug)}
              </span>
            ))}
            .
          </span>
        </FormMessage>
      )}

      {product.description && (
        <div className="product-section">
          <SectionHeader title="Description" variant="primary" />
          <RichText className="product-description">
            <Suspense fallback={<p>{product.description}</p>}>
              <Markdown>{product.description}</Markdown>
            </Suspense>
          </RichText>
        </div>
      )}

      {hasIngredients && (
        <div className="product-section">
          <SectionHeader title="Ingrédients" count={product.ingredients.length} variant="primary">
            <Button
              variant="ghost"
              size="sm"
              onClick={handleCopyIngredients}
              aria-label="Copier la liste des ingrédients"
              className="ingredient-copy"
            >
              {copied ? (
                <>
                  <Check size={14} aria-hidden="true" />
                  <span>Copié</span>
                </>
              ) : (
                <>
                  <Copy size={14} aria-hidden="true" />
                  <span>Copier</span>
                </>
              )}
            </Button>
          </SectionHeader>
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

      {product.inci && (
        <details className="product-section product-inci">
          <summary className="product-inci__summary">Composition INCI complète</summary>
          <p className="product-inci__body">{product.inci}</p>
        </details>
      )}

      {product.notes && (
        <aside
          className="product-section product-notes-block"
          aria-labelledby="product-notes-title"
        >
          <h3 id="product-notes-title" className="product-notes-block__title">
            Notes
          </h3>
          <p className="product-notes-block__body">{product.notes}</p>
        </aside>
      )}

      {product.url && (
        <div className="product-section product-section--cta">
          <a href={product.url} target="_blank" rel="noopener noreferrer" className="product-link">
            <ExternalLink size={16} aria-hidden="true" />
            <span>Voir le produit</span>
            <span className="sr-only"> (nouvel onglet)</span>
          </a>
        </div>
      )}
    </>
  )
}
