import { type Mutation, MutationCache, QueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'

import { reportError } from './errorReporter'
import { isApiError } from './helpers/apiError'

// `meta.errorMessage` opts in to a generic toast; `meta.silent` skips reportError when 4xx is part of the contract.
declare module '@tanstack/react-query' {
  interface Register {
    mutationMeta: { errorMessage?: string; silent?: boolean }
    queryMeta: { silent?: boolean }
  }
}

// Exported for testing the report-vs-silent and toast dedup behaviour.
export function handleMutationError(
  error: unknown,
  mutation: Pick<Mutation, 'meta' | 'options'>
): void {
  if (!mutation.meta?.silent) {
    reportError(error as Error, {
      source: 'mutation',
      mutationKey: mutation.options.mutationKey,
    })
  }
  const message = mutation.meta?.errorMessage
  // `id` dedupes identical toasts from parallel failures (e.g. unreachable backend).
  if (message) toast.error(message, { id: message })
}

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60,
      // 4xx won't recover on retry; only retry transient failures once.
      retry: (failureCount, err) => {
        if (isApiError(err) && err.status >= 400 && err.status < 500) return false
        return failureCount < 1
      },
    },
  },
  mutationCache: new MutationCache({
    onError: (error, _vars, _ctx, mutation) => handleMutationError(error, mutation),
  }),
})
