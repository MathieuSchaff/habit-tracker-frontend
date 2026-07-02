import { useQuery, useSuspenseQuery } from '@tanstack/react-query'
import { getRouteApi, Link } from '@tanstack/react-router'
import { Check, ChevronDown, Copy, ExternalLink, FlaskConical, StickyNote } from 'lucide-react'
import { lazy, Suspense, useCallback, useMemo } from 'react'

import { sanitizeUrl } from '../../../../lib/url'

// Defer ~50KB gzip; description is below the fold on first paint.
const Markdown = lazy(() => import('react-markdown'))

import { Button } from '@/component/Button/Button'
import { Badge } from '@/component/DataDisplay/Badge/Badge'
import { FormMessage } from '@/component/Feedback/ui/FormMessage/FormMessage'
import { IconBox } from '@/component/Layout/IconBox/IconBox'
import { RichText } from '@/component/Typography/RichText/RichText'
import { SectionHeader } from '@/component/Typography/SectionHeader/SectionHeader'
import { SKIN_CONCERN_LABELS, SKIN_TYPE_LABELS } from '@/constants/skin'
import { ReportContentButton } from '@/features/discussions/components/ReportContentButton'
import { SuggestEditButton } from '@/features/discussions/components/SuggestEditButton'
import { FormulaReading } from '@/features/products/components/FormulaReading/FormulaReading'
import { ProductSummary } from '@/features/products/components/ProductSummary/ProductSummary'
import { deriveKpChips } from '@/features/products/kp-chips'
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

function getDomain(url: string | null): string | null {
  if (!url) return null
  try {
    return new URL(url).hostname.replace(/^www\./, '')
  } catch {
    return null
  }
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

  const profileSlugs = useMemo(() => {
    if (!user || !dermoProfile) return new Set<string>()
    return new Set<string>([...(dermoProfile.skinTypes ?? []), ...dermoProfile.skinConcerns])
  }, [user, dermoProfile])

  const warnings = useMemo(
    () => product.tags.filter((t) => t.relevance === 'avoid' && profileSlugs.has(t.tagSlug)),
    [profileSlugs, product.tags]
  )

  // KP bridge — positive mirror of `warnings`: surfaced live for a declared-KP
  // profile only, derived from neutral signals, never stored as a product tag.
  const kpChips = useMemo(
    () => deriveKpChips({ profileSlugs, tags: product.tags, inci: product.inci }),
    [profileSlugs, product.tags, product.inci]
  )

  const safeUrl = sanitizeUrl(product.url)
  const externalDomain = getDomain(safeUrl)

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

      {(kpChips.bumps || kpChips.red) && (
        <div className="product-kp-bridge">
          <span className="product-kp-bridge__intro">
            Pour votre profil {profileLabel('keratose-pilaire').toLowerCase()}, peut aider :
          </span>
          {kpChips.bumps && <Badge variant="chip">texture</Badge>}
          {kpChips.red && <Badge variant="chip">rougeurs</Badge>}
        </div>
      )}

      <ProductSummary
        kind={product.kind}
        categories={product.ingredients?.map((i) => i.ingredientCategory) ?? []}
      />

      {product.inci && (
        <FormulaReading slug={slug} userKey={user?.id ?? null} profileSlugs={profileSlugs} />
      )}

      {product.inci && (
        <details className="product-section product-inci">
          <summary className="product-inci__summary">
            <span>Composition INCI complète</span>
            <ChevronDown size={14} className="product-inci__chevron" aria-hidden="true" />
          </summary>
          <p className="product-inci__body">{product.inci}</p>
        </details>
      )}

      {hasIngredients && (
        <div className="product-section">
          <SectionHeader title="Ingrédients" count={product.ingredients.length}>
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
          <ul role="list" className="ingredient-list">
            {product.ingredients.map((ing) => {
              const concentration = formatConcentration(
                ing.concentrationValue,
                ing.concentrationUnit,
                ing.concentrationPer
              )
              const cat = ing.ingredientCategory?.toLowerCase() ?? null
              return (
                <li
                  key={ing.ingredientSlug}
                  className="ingredient-item"
                  data-cat={cat ?? undefined}
                >
                  <IconBox className="ingredient-item__icon">
                    <FlaskConical size={14} />
                  </IconBox>
                  <div className="ingredient-item__body">
                    <Link
                      to="/ingredients/$slug"
                      params={{ slug: ing.ingredientSlug }}
                      className="ingredient-item__name"
                    >
                      {ing.ingredientName}
                    </Link>
                    <div className="ingredient-item__meta">
                      {ing.ingredientCategory && (
                        <span className="ingredient-item__category">{ing.ingredientCategory}</span>
                      )}
                      {ing.notes && (
                        <>
                          <span className="ingredient-item__sep" aria-hidden="true">
                            ·
                          </span>
                          <span className="ingredient-item__notes">{ing.notes}</span>
                        </>
                      )}
                    </div>
                  </div>
                  {concentration && (
                    <span className="ingredient-item__concentration">{concentration}</span>
                  )}
                </li>
              )
            })}
          </ul>
        </div>
      )}

      {product.notes && (
        <aside
          className="product-section product-notes-block"
          aria-labelledby="product-notes-title"
        >
          <IconBox className="product-notes-block__icon">
            <StickyNote size={14} />
          </IconBox>
          <div>
            <h3 id="product-notes-title" className="product-notes-block__title">
              Notes
            </h3>
            <p className="product-notes-block__body">{product.notes}</p>
          </div>
        </aside>
      )}

      {safeUrl !== null && (
        <div className="product-section product-section--cta">
          <a href={safeUrl} target="_blank" rel="noopener noreferrer" className="product-link">
            <ExternalLink size={14} aria-hidden="true" />
            <span>Voir le produit</span>
            {externalDomain && <span className="product-link__domain">{externalDomain}</span>}
            <span className="sr-only"> (nouvel onglet)</span>
          </a>
        </div>
      )}

      {product.description && (
        <details className="product-section product-inci product-brand-copy">
          <summary className="product-inci__summary">
            <span>Texte de la marque</span>
            <ChevronDown size={14} className="product-inci__chevron" aria-hidden="true" />
          </summary>
          {/* Manufacturer copy: commercial voice, not vetted by Aurore - keep it boxed off. */}
          <div className="product-brand-copy__body">
            <p className="product-brand-copy__note">Voix commerciale, non vérifiée par Aurore.</p>
            <RichText className="product-description">
              <Suspense fallback={<p>{product.description}</p>}>
                <Markdown>{product.description}</Markdown>
              </Suspense>
            </RichText>
          </div>
        </details>
      )}

      {user && (
        <div className="product-section">
          <ReportContentButton targetType="product" targetId={product.id} />
          <SuggestEditButton targetType="product" targetId={product.id} />
        </div>
      )}
    </>
  )
}
