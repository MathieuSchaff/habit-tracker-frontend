import { queryOptions, useMutation, useQueryClient } from '@tanstack/react-query'

import { api } from '../api'

type EntityType = 'product' | 'ingredient'

export const discussionKeys = {
  threads: (entityType: EntityType, slug: string) => ['discussions', entityType, slug] as const,
  thread: (entityType: EntityType, slug: string, threadId: string) =>
    ['discussions', entityType, slug, threadId] as const,
}

export const discussionQueries = {
  threads: (entityType: EntityType, slug: string) =>
    queryOptions({
      queryKey: discussionKeys.threads(entityType, slug),
      queryFn: async () => {
        const res =
          entityType === 'product'
            ? await api.products[':slug'].discussions.$get({ param: { slug } })
            : await api.ingredients[':slug'].discussions.$get({ param: { slug } })
        if (!res.ok) throw new Error('Failed to fetch threads')
        const json = await res.json()
        return json.data
      },
    }),

  thread: (entityType: EntityType, slug: string, threadId: string) =>
    queryOptions({
      queryKey: discussionKeys.thread(entityType, slug, threadId),
      queryFn: async () => {
        const res =
          entityType === 'product'
            ? await api.products[':slug'].discussions[':threadId'].$get({
                param: { slug, threadId },
              })
            : await api.ingredients[':slug'].discussions[':threadId'].$get({
                param: { slug, threadId },
              })
        if (!res.ok) throw new Error('Failed to fetch thread')
        const json = await res.json()
        return json.data
      },
    }),
}

export function useCreateThread(entityType: EntityType, slug: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (input: { title: string; content: string }) => {
      const res =
        entityType === 'product'
          ? await api.products[':slug'].discussions.$post({ param: { slug }, json: input })
          : await api.ingredients[':slug'].discussions.$post({ param: { slug }, json: input })
      if (!res.ok) throw new Error('Failed to create thread')
      const json = await res.json()
      return json.data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: discussionKeys.threads(entityType, slug) })
    },
  })
}

export function useCreateReply(entityType: EntityType, slug: string, threadId: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (input: { content: string }) => {
      const res =
        entityType === 'product'
          ? await api.products[':slug'].discussions[':threadId'].replies.$post({
              param: { slug, threadId },
              json: input,
            })
          : await api.ingredients[':slug'].discussions[':threadId'].replies.$post({
              param: { slug, threadId },
              json: input,
            })
      if (!res.ok) throw new Error('Failed to create reply')
      const json = await res.json()
      return json.data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: discussionKeys.thread(entityType, slug, threadId) })
    },
  })
}

export function useDeleteThread(entityType: EntityType, slug: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (threadId: string) => {
      const res =
        entityType === 'product'
          ? await api.products[':slug'].discussions[':threadId'].$delete({
              param: { slug, threadId },
            })
          : await api.ingredients[':slug'].discussions[':threadId'].$delete({
              param: { slug, threadId },
            })
      if (!res.ok) throw new Error('Failed to delete thread')
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: discussionKeys.threads(entityType, slug) })
    },
  })
}

export function useDeleteReply(entityType: EntityType, slug: string, threadId: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (replyId: string) => {
      const res =
        entityType === 'product'
          ? await api.products[':slug'].discussions[':threadId'].replies[':replyId'].$delete({
              param: { slug, threadId, replyId },
            })
          : await api.ingredients[':slug'].discussions[':threadId'].replies[':replyId'].$delete({
              param: { slug, threadId, replyId },
            })
      if (!res.ok) throw new Error('Failed to delete reply')
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: discussionKeys.thread(entityType, slug, threadId) })
    },
  })
}
