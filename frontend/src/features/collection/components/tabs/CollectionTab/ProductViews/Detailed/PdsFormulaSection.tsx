import { hasFragranceComponent } from '@habit-tracker/shared'

import { useQuery } from '@tanstack/react-query'
import { Link } from '@tanstack/react-router'
import { Check, Copy, Droplets, Sparkles } from 'lucide-react'
import { useCallback, useMemo } from 'react'

import { useCopyToClipboard } from '@/hooks/useCopyToClipboard'
import { productQueries } from '@/lib/queries/products'
import { profileQueries } from '@/lib/queries/profile'
import type { UserProduct } from '@/lib/queries/user-products'
import { useAuthStore } from '@/store/auth'

interface PdsFormulaSectionProps {
  p: UserProduct
}

export function PdsFormulaSection({ p }: PdsFormulaSectionProps) {
  const { data: fullProduct, isError: fullProductError } = useQuery(
    productQueries.bySlug(p.product.slug)
  )

  const { copied: inciCopied, copy: copyInci } = useCopyToClipboard()
  const handleCopyInci = useCallback(() => {
    if (fullProduct?.inci) void copyInci(fullProduct.inci)
  }, [fullProduct?.inci, copyInci])

  const user = useAuthStore((s) => s.user)
  const { data: dermoProfile } = useQuery({
    ...profileQueries.dermo(),
    enabled: !!user,
  })

  // §4 "À noter": contextual notes when user prefs intersect formula signals.
  const fragranceNote =
    dermoProfile?.skinTypes?.includes('peau-sensible') &&
    fullProduct?.ingredients &&
    hasFragranceComponent(fullProduct.ingredients)

  const inciCount = useMemo(
    () => (fullProduct?.inci ? fullProduct.inci.split(',').filter((s) => s.trim()).length : 0),
    [fullProduct?.inci]
  )

  return (
    <>
      {/* INCI promoted to top per design brief. */}
      {fullProductError ? (
        <p className="pds-empty-msg" role="alert">
          Détails indisponibles — vérifiez votre connexion.
        </p>
      ) : fullProduct?.inci ? (
        <article className="pds-inci">
          <header className="pds-inci-head">
            <div className="pds-inci-eyebrow">
              <span className="pds-inci-rule" aria-hidden="true" />
              <span>Liste INCI</span>
              <span className="pds-inci-count">{inciCount} ingrédients</span>
            </div>
            <button
              type="button"
              className="pds-inci-copy"
              onClick={handleCopyInci}
              aria-label="Copier la liste INCI brute"
            >
              {inciCopied ? <Check size={13} /> : <Copy size={13} />}
              <span>{inciCopied ? 'Copié' : 'Copier'}</span>
            </button>
          </header>
          <p className="pds-inci-text">{fullProduct.inci}</p>
        </article>
      ) : null}

      {/* Composants principaux - flowing serif tags under INCI. */}
      {fullProduct?.ingredients && fullProduct.ingredients.length > 0 ? (
        <div className="pds-ingtags-wrap">
          <h3 className="pds-microhead">
            <Droplets size={12} aria-hidden="true" />
            <span>Composants principaux</span>
          </h3>
          <ul className="pds-ingtags">
            {fullProduct.ingredients.map((pi) => (
              <li key={pi.ingredientId}>
                <Link
                  to="/ingredients/$slug"
                  params={{ slug: pi.ingredientSlug }}
                  className="pds-ingtag"
                >
                  {pi.ingredientName}
                </Link>
              </li>
            ))}
          </ul>
        </div>
      ) : !fullProductError && !fullProduct?.inci ? (
        <p className="pds-empty-msg">
          Liste d'ingrédients non ajoutée. Vous pouvez garder ce produit comme note personnelle.
        </p>
      ) : null}

      {/* §4 À noter - warm inline callout, render only on trigger. */}
      {fragranceNote && (
        <div className="pds-note" role="note">
          <Sparkles size={14} className="pds-note-icon" aria-hidden="true" />
          <div>
            <strong>Composants parfumants</strong> — vous suivez souvent les parfums sur peau
            sensible.
          </div>
        </div>
      )}

      {/* §3 Description - naked paragraph, calm. */}
      {fullProduct?.description && <p className="pds-glance">{fullProduct.description}</p>}
    </>
  )
}
