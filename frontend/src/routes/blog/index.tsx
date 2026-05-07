import { createFileRoute, stripSearchParams, useNavigate } from '@tanstack/react-router'
import { zodValidator } from '@tanstack/zod-adapter'
import { z } from 'zod'

import { GlobalError } from '@/component/Feedback/app/GlobalError/GlobalError'
import { BlogListPage } from '@/features/blog/components/BlogListPage'
import { BlogListSkeleton } from '@/features/blog/components/skeletons/BlogSkeletons'
import { articleQueries } from '@/lib/queries/articles'

const searchSchema = z.object({
  page: z.number().min(1).default(1),
  q: z.string().optional(),
})

const defaultValues = { page: 1 }

export const Route = createFileRoute('/blog/')({
  validateSearch: zodValidator(searchSchema),
  search: {
    middlewares: [stripSearchParams(defaultValues)],
  },
  loaderDeps: ({ search: { page, q } }) => ({ page, q }),
  loader: ({ context, deps }) =>
    context.queryClient.ensureQueryData(
      articleQueries.list({ page: deps.page, q: deps.q, limit: 20 })
    ),
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
