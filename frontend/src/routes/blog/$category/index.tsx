import { BLOG_CATEGORY_VALUES, type BlogCategory } from '@aurore/shared'

import { createFileRoute, notFound, stripSearchParams, useNavigate } from '@tanstack/react-router'
import { z } from 'zod'

import { GlobalError } from '@/component/Feedback/app/GlobalError/GlobalError'
import { BlogListSkeleton } from '@/features/blog/components/skeletons/BlogSkeletons'
import { BlogListPage } from '@/features/blog/page/BlogListPage/BlogListPage'
import { articleQueries } from '@/lib/queries/articles'

const searchSchema = z.object({
  page: z.number().min(1).default(1),
  q: z.string().optional(),
})

const defaultValues = { page: 1 }

const categorySet = new Set<string>(BLOG_CATEGORY_VALUES)

export const Route = createFileRoute('/blog/$category/')({
  validateSearch: searchSchema,
  search: {
    middlewares: [stripSearchParams(defaultValues)],
  },
  beforeLoad: ({ params }) => {
    if (!categorySet.has(params.category)) throw notFound()
  },
  loaderDeps: ({ search: { page, q } }) => ({ page, q }),
  // prefetchQuery warms cache without throwing; a failed fetch degrades to the in-page error UI instead of GlobalError.
  loader: ({ context, params, deps }) =>
    Promise.all([
      context.queryClient.prefetchQuery(
        articleQueries.list({
          category: params.category as BlogCategory,
          page: deps.page,
          q: deps.q,
          limit: 20,
        })
      ),
      context.queryClient.prefetchQuery(articleQueries.categoryCounts()),
    ]),
  component: BlogCategoryRoute,
  pendingComponent: BlogListSkeleton,
  errorComponent: ({ error, reset }) => <GlobalError error={error} reset={reset} />,
})

function BlogCategoryRoute() {
  const { category } = Route.useParams()
  const { page, q } = Route.useSearch()
  const navigate = useNavigate({ from: '/blog/$category/' })

  return (
    <BlogListPage
      category={category as BlogCategory}
      page={page}
      q={q}
      onPageChange={(next) => navigate({ search: (prev) => ({ ...prev, page: next }) })}
      onSearchChange={(next) =>
        navigate({ search: (prev) => ({ ...prev, q: next || undefined, page: 1 }) })
      }
    />
  )
}
