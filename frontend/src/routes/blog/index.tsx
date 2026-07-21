import { createFileRoute, stripSearchParams, useNavigate } from '@tanstack/react-router'
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

export const Route = createFileRoute('/blog/')({
  // SSR the editorial hub so the bare path ships index,follow + canonical server-side.
  ssr: true,
  validateSearch: searchSchema,
  search: {
    middlewares: [stripSearchParams(defaultValues)],
  },
  // Reading match.search collapses TanStack's search-schema to {} for the route,
  // so the bare hub stays indexable and variants consolidate to this canonical.
  head: () =>
    seoHead({
      path: '/blog',
      title: 'Blog — Aurore',
      description:
        'Le journal Aurore : lecture de formules, routines et choix de conception, sans score ni verdict.',
    }),
  loaderDeps: ({ search: { page, q } }) => ({ page, q }),
  // prefetchQuery warms cache without throwing; ensureQueryData would reject the loader and swap the page for GlobalError. Components own their loading/error UI.
  loader: ({ context, deps }) =>
    Promise.all([
      context.queryClient.prefetchQuery(
        articleQueries.list({ page: deps.page, q: deps.q, limit: 20 })
      ),
      context.queryClient.prefetchQuery(articleQueries.categoryCounts()),
    ]),
  component: BlogIndexRoute,
  pendingComponent: BlogListSkeleton,
  errorComponent: ({ error, reset }) => <GlobalError error={error} reset={reset} />,
})

function BlogIndexRoute() {
  const { page, q } = Route.useSearch()
  const navigate = useNavigate({ from: '/blog/' })

  return (
    <BlogListPage
      page={page}
      q={q}
      onPageChange={(next) => navigate({ search: (prev) => ({ ...prev, page: next }) })}
      onSearchChange={(next) =>
        navigate({ search: (prev) => ({ ...prev, q: next || undefined, page: 1 }) })
      }
    />
  )
}
