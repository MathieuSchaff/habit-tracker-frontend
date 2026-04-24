import { createFileRoute, stripSearchParams, useNavigate } from '@tanstack/react-router'
import { zodValidator } from '@tanstack/zod-adapter'
import { z } from 'zod'

import { BlogListPage } from '@/features/blog/components/BlogListPage'
import { BlogListSkeleton } from '@/features/blog/components/skeletons/BlogSkeletons'
import { articleQueries } from '@/lib/queries/articles'

const searchSchema = z.object({
  page: z.number().min(1).default(1).catch(1),
})

const defaultValues = { page: 1 }

export const Route = createFileRoute('/blog/')({
  validateSearch: zodValidator(searchSchema),
  search: {
    middlewares: [stripSearchParams(defaultValues)],
  },
  loaderDeps: ({ search: { page } }) => ({ page }),
  loader: ({ context, deps }) =>
    context.queryClient.ensureQueryData(articleQueries.list({ page: deps.page, limit: 20 })),
  component: BlogIndexRoute,
  pendingComponent: BlogListSkeleton,
})

function BlogIndexRoute() {
  const { page } = Route.useSearch()
  const navigate = useNavigate({ from: '/blog/' })

  return (
    <BlogListPage
      page={page}
      onPageChange={(next) => navigate({ search: (prev) => ({ ...prev, page: next }) })}
    />
  )
}
