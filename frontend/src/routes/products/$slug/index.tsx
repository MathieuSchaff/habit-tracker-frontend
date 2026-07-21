import { evaluateSeoEligibility } from '@aurore/shared'

import { createFileRoute, notFound } from '@tanstack/react-router'

import { GlobalError } from '@/component/Feedback/app/GlobalError/GlobalError'
import { ProductInfoSkeleton } from '@/features/products/components/skeletons/ProductLayoutSkeleton/ProductLayoutSkeleton'
import { ProductInfoTab } from '@/features/products/pages/ProductInfoTab/ProductInfoTab'
import { ApiError } from '@/lib/helpers/apiError'
import { productQueries } from '@/lib/queries/products'
import { canonicalUrl, clampDesc, INDEX_ROBOTS, NOINDEX_ROBOTS, seoHead } from '@/lib/seo'

export const Route = createFileRoute('/products/$slug/')({
  ssr: true,
  loader: ({ context, params }) =>
    context.queryClient
      .ensureQueryData(productQueries.bySlug(params.slug))
      // Head-only fields: the full product reaches the component through the
      // dehydrated Query cache, so returning it here would ship it twice.
      .then((p) => ({
        name: p.name,
        brand: p.brand,
        imageUrl: p.imageUrl,
        category: p.category,
        moderationStatus: p.moderationStatus,
        hasInci: Boolean(p.inci?.trim()),
      }))
      .catch((err) => {
        // Missing product = 404 → notFoundComponent; keep 5xx/429 on the real error UI.
        if (err instanceof ApiError && err.status === 404) throw notFound()
        throw err
      }),
  head: ({ loaderData, params }) => {
    if (!loaderData) return {}
    const path = `/products/${params.slug}`
    const title = `${loaderData.name} · ${loaderData.brand} — Aurore`
    // Use the composed description, not the scraped one: scraped prose is long,
    // multilingual and marketing-heavy, bad for FR search.
    const description = clampDesc(
      `Formule, ingrédients et notes de ${loaderData.name} (${loaderData.brand}) sur Aurore — sans score ni verdict.`
    )
    // The same publication decision feeds this head and the sitemap. seoHead
    // also drops Product JSON-LD when the decision yields noindex.
    const eligibility = evaluateSeoEligibility({
      kind: 'product',
      moderationStatus: loaderData.moderationStatus,
      category: loaderData.category,
      hasInci: loaderData.hasInci,
    })
    const robots = eligibility.indexable ? INDEX_ROBOTS : NOINDEX_ROBOTS
    return seoHead({
      path,
      title,
      description,
      ogTitle: title,
      ogDescription: description,
      ogType: 'product',
      image: loaderData.imageUrl,
      robots,
      // No offers/aggregateRating on purpose: Aurore states no price, score or verdict.
      jsonLd: {
        '@context': 'https://schema.org',
        '@type': 'Product',
        name: loaderData.name,
        brand: { '@type': 'Brand', name: loaderData.brand },
        ...(loaderData.imageUrl ? { image: loaderData.imageUrl } : {}),
        description,
        url: canonicalUrl(path),
      },
    })
  },

  pendingComponent: ProductInfoSkeleton,
  notFoundComponent: () => <GlobalError error={new Error('not_found')} is404 />,
  errorComponent: ({ error, reset }) => <GlobalError error={error} reset={reset} />,
  component: ProductInfoTab,
})
