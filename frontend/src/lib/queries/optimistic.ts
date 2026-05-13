import type { QueryClient, QueryKey } from '@tanstack/react-query'

type QueryKeyFactory<TVariables> = QueryKey | ((variables: TVariables) => QueryKey)

export type OptimisticCacheUpdate<TVariables, TData = unknown> = {
  queryKey: QueryKeyFactory<TVariables>
  updater: (oldData: TData | undefined, variables: TVariables) => TData | undefined
}

export type OptimisticUpdateContext = {
  rollback: () => void
}

export function optimisticCacheUpdate<TVariables, TData>(
  update: OptimisticCacheUpdate<TVariables, TData>
): OptimisticCacheUpdate<TVariables> {
  return update as OptimisticCacheUpdate<TVariables>
}

function resolveQueryKey<TVariables>(queryKey: QueryKeyFactory<TVariables>, variables: TVariables) {
  return typeof queryKey === 'function' ? queryKey(variables) : queryKey
}

export async function applyOptimisticUpdates<TVariables>(
  queryClient: QueryClient,
  variables: TVariables,
  updates: OptimisticCacheUpdate<TVariables>[]
): Promise<OptimisticUpdateContext> {
  const resolvedUpdates = updates.map((update) => ({
    ...update,
    queryKey: resolveQueryKey(update.queryKey, variables),
  }))

  await Promise.all(resolvedUpdates.map(({ queryKey }) => queryClient.cancelQueries({ queryKey })))

  const snapshots = resolvedUpdates.map(({ queryKey }) => ({
    queryKey,
    previousData: queryClient.getQueryData(queryKey),
  }))

  resolvedUpdates.forEach(({ queryKey, updater }) => {
    queryClient.setQueryData(queryKey, (oldData) => updater(oldData, variables))
  })

  return {
    rollback: () => {
      snapshots.forEach(({ queryKey, previousData }) => {
        queryClient.setQueryData(queryKey, previousData)
      })
    },
  }
}
