import { BLOG_CATEGORY_LABELS, BLOG_CATEGORY_VALUES, type BlogCategory } from '@aurore/shared'

import { createFileRoute, notFound, stripSearchParams, useNavigate } from '@tanstack/react-router'
import { z } from 'zod'

import { GlobalError } from '@/component/Feedback/app/GlobalError/GlobalError'
import { BlogListSkeleton } from '@/features/blog/components/skeletons/BlogSkeletons'
import { BlogListPage } from '@/features/blog/page/BlogListPage/BlogListPage'
import { articleQueries } from '@/lib/queries/articles'
import { seoHead } from '@/lib/seo'

const searchSchema = z.object({
  page: z.number().min(1).default(1),
  q: z.string().optional(),
})

const defaultValues = { page: 1 }

type Search = z.infer<typeof searchSchema>

const categorySet = new Set<string>(BLOG_CATEGORY_VALUES)

export const Route = createFileRoute('/blog/$category/')({
  // SSR so the bare category path ships its robots + canonical server-side.
  ssr: true,
  validateSearch: searchSchema,
  search: {
    middlewares: [stripSearchParams(defaultValues)],
  },
  beforeLoad: ({ params }) => {
    if (!categorySet.has(params.category)) throw notFound()
  },
  // params-only: reading match/loaderData collapses the route's search-schema to {}.
  // Empty categories stay indexable but out of the sitemap; variants consolidate here.
  // beforeLoad already 404s unknown categories, so the label lookup can't miss.
  head: ({ params }) =>
    seoHead({
      path: `/blog/${params.category}`,
      title: `${BLOG_CATEGORY_LABELS[params.category as BlogCategory]} — Aurore`,
    }),
  // Input pinned to Search: a head() that reads ctx otherwise collapses this route's
  // search-schema inference to {}, which cascades into deps here.
  loaderDeps: ({ search }: { search: Search }) => ({ page: search.page, q: search.q }),
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
