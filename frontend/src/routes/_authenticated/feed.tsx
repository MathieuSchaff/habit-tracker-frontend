import { feedQuerySchema } from '@aurore/shared'

import { createFileRoute, stripSearchParams } from '@tanstack/react-router'

import { FeedPage } from '@/features/social/page/FeedPage'

// URL contract = API contract: the same schema validates the search params and the
// route query, so tone/order defaults and the optional concern stay in sync.
const defaults = { tone: 'principal', order: 'recency' } as const

export const Route = createFileRoute('/_authenticated/feed')({
  validateSearch: feedQuerySchema,
  search: { middlewares: [stripSearchParams(defaults)] },
  component: FeedPage,
})
