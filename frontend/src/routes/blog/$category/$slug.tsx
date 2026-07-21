import { BLOG_CATEGORY_VALUES } from '@aurore/shared'

import { createFileRoute, notFound, redirect } from '@tanstack/react-router'

import { GlobalError } from '@/component/Feedback/app/GlobalError/GlobalError'
import { BlogArticleSkeleton } from '@/features/blog/components/skeletons/BlogSkeletons'
import { BlogArticlePage } from '@/features/blog/page/BlogArticlePage/BlogArticlePage'
import { ApiError } from '@/lib/helpers/apiError'
import { articleQueries } from '@/lib/queries/articles'
import { canonicalUrl, clampDesc, seoHead } from '@/lib/seo'

const categorySet = new Set<string>(BLOG_CATEGORY_VALUES)

export const Route = createFileRoute('/blog/$category/$slug')({
  ssr: true,
  beforeLoad: ({ params }) => {
    if (!categorySet.has(params.category)) throw notFound()
  },
  loader: async ({ context, params }) => {
    const article = await context.queryClient
      .ensureQueryData(articleQueries.bySlug(params.slug))
      .catch((err) => {
        // Missing article = 404 → notFoundComponent; keep 5xx/429 on the real error UI.
        if (err instanceof ApiError && err.status === 404) throw notFound()
        throw err
      })
    if (article.category !== params.category) {
      throw redirect({
        to: '/blog/$category/$slug',
        params: { category: article.category, slug: article.slug },
        replace: true,
        // Permanent: the category in the URL is wrong, crawlers should transfer
        // to the canonical URL instead of keeping this one (default is 307).
        statusCode: 301,
      })
    }
    // Head-only fields: the full article reaches the component through the
    // dehydrated Query cache, so returning it here would ship it twice.
    return {
      title: article.title,
      excerpt: article.excerpt,
      coverImageUrl: article.coverImageUrl,
      publishedAt: article.publishedAt,
      updatedAt: article.updatedAt,
    }
  },
  head: ({ loaderData, params }) => {
    if (!loaderData) return {}
    const path = `/blog/${params.category}/${params.slug}`
    // Editorial content: the real excerpt is clean and unique, so use it (unlike the
    // scraped product prose); fall back to the title when an article has no excerpt.
    const description = clampDesc(
      loaderData.excerpt || `${loaderData.title}, à lire au calme sur Aurore.`
    )
    return seoHead({
      path,
      title: `${loaderData.title} — Aurore`,
      description,
      ogTitle: loaderData.title,
      ogDescription: description,
      ogType: 'article',
      image: loaderData.coverImageUrl,
      publishedTime: loaderData.publishedAt,
      jsonLd: {
        '@context': 'https://schema.org',
        '@type': 'BlogPosting',
        headline: loaderData.title,
        description,
        ...(loaderData.publishedAt ? { datePublished: loaderData.publishedAt } : {}),
        ...(loaderData.updatedAt ? { dateModified: loaderData.updatedAt } : {}),
        ...(loaderData.coverImageUrl ? { image: loaderData.coverImageUrl } : {}),
        url: canonicalUrl(path),
      },
    })
  },
  component: BlogArticleRoute,
  pendingComponent: BlogArticleSkeleton,
  notFoundComponent: () => <GlobalError error={new Error('not_found')} is404 />,
  errorComponent: ({ error, reset }) => <GlobalError error={error} reset={reset} />,
})

function BlogArticleRoute() {
  const { slug } = Route.useParams()
  return <BlogArticlePage slug={slug} />
}
