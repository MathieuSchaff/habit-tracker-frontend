import { BLOG_CATEGORY_VALUES } from '@aurore/shared'

import { createFileRoute, notFound, redirect } from '@tanstack/react-router'

import { GlobalError } from '@/component/Feedback/app/GlobalError/GlobalError'
import { BlogArticleSkeleton } from '@/features/blog/components/skeletons/BlogSkeletons'
import { BlogArticlePage } from '@/features/blog/page/BlogArticlePage/BlogArticlePage'
import { ApiError } from '@/lib/helpers/apiError'
import { articleQueries } from '@/lib/queries/articles'

const categorySet = new Set<string>(BLOG_CATEGORY_VALUES)

export const Route = createFileRoute('/blog/$category/$slug')({
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
      })
    }
    return article
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
