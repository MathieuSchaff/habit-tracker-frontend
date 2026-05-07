import { BLOG_CATEGORY_VALUES, type BlogCategory } from '@habit-tracker/shared'

import { createFileRoute, notFound, stripSearchParams, useNavigate } from '@tanstack/react-router'
import { zodValidator } from '@tanstack/zod-adapter'
import { z } from 'zod'

import { BlogListPage } from '@/features/blog/components/BlogListPage'
import { BlogListSkeleton } from '@/features/blog/components/skeletons/BlogSkeletons'
import { articleQueries } from '@/lib/queries/articles'

const searchSchema = z.object({
  page: z.number().min(1).default(1),
  q: z.string().optional(),
})

const defaultValues = { page: 1 }

const categorySet = new Set<string>(BLOG_CATEGORY_VALUES)

export const Route = createFileRoute('/blog/$category/')({
  validateSearch: zodValidator(searchSchema),
  search: {
    middlewares: [stripSearchParams(defaultValues)],
  },
  beforeLoad: ({ params }) => {
    if (!categorySet.has(params.category)) throw notFound()
  },
  loaderDeps: ({ search: { page, q } }) => ({ page, q }),
  loader: ({ context, params, deps }) =>
    context.queryClient.ensureQueryData(
      articleQueries.list({
        category: params.category as BlogCategory,
        page: deps.page,
        q: deps.q,
        limit: 20,
      })
    ),
  component: BlogCategoryRoute,
  pendingComponent: BlogListSkeleton,
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
