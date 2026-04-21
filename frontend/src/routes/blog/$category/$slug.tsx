import { BLOG_CATEGORY_VALUES } from '@habit-tracker/shared'

import { createFileRoute, notFound, redirect } from '@tanstack/react-router'

import { BlogArticlePage } from '@/features/blog/components/BlogArticlePage'
import { BlogArticleSkeleton } from '@/features/blog/components/skeletons/BlogSkeletons'
import { articleQueries } from '@/lib/queries/articles'

const categorySet = new Set<string>(BLOG_CATEGORY_VALUES)

export const Route = createFileRoute('/blog/$category/$slug')({
  beforeLoad: ({ params }) => {
    if (!categorySet.has(params.category)) throw notFound()
  },
  loader: async ({ context, params }) => {
    const article = await context.queryClient.ensureQueryData(articleQueries.bySlug(params.slug))
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
})

function BlogArticleRoute() {
  const { slug } = Route.useParams()
  return <BlogArticlePage slug={slug} />
}
