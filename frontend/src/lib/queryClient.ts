import { MutationCache, type Mutation, QueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'

import { reportError } from './errorReporter'
import { isApiError } from './helpers/apiError'

// Opt-in error toast: a mutation hook sets `meta.errorMessage` when a generic
// toast is the right UX. Hooks with bespoke error handling (auth forms, conflict
// resolution) leave it unset so the global handler stays out of their way.
// `meta.silent` skips reportError for hooks where 4xx is part of the contract.
declare module '@tanstack/react-query' {
  interface Register {
    mutationMeta: { errorMessage?: string; silent?: boolean }
    queryMeta: { silent?: boolean }
  }
}

// Exported for testing — covers report-vs-silent and toast dedup behaviour.
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
  // `id` dedupes identical toasts when several mutations fail in parallel
  // (e.g. status spam against an unreachable backend).
  if (message) toast.error(message, { id: message })
}

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60,
      // Retry transient failures only; client errors (4xx) won't recover by
      // hitting the same endpoint again, so don't waste latency on them.
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
