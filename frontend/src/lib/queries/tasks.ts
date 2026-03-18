import type {
  CreateSubtaskInput,
  CreateTaskInput,
  Subtask,
  Task,
  UpdateSubtaskInput,
  UpdateTaskInput,
} from '@habit-tracker/shared'

import { queryOptions, useMutation, useQueryClient } from '@tanstack/react-query'

import { api } from '../api'

export const taskKeys = {
  all: ['tasks'] as const,
  list: () => [...taskKeys.all, 'list'] as const,
  today: () => [...taskKeys.all, 'today'] as const,
  subtasks: (taskId: string) => [...taskKeys.all, taskId, 'subtasks'] as const,
}

export const taskQueries = {
  list: () =>
    queryOptions({
      queryKey: taskKeys.list(),
      queryFn: async () => {
        const res = await api.tasks.$get()
        if (!res.ok) throw new Error('Failed to fetch tasks')
        const json = await res.json()
        return json.data as Task[]
      },
    }),

  today: () =>
    queryOptions({
      queryKey: taskKeys.today(),
      queryFn: async () => {
        const res = await api.tasks.today.$get()
        if (!res.ok) throw new Error('Failed to fetch today tasks')
        const json = await res.json()
        return json.data as Task[]
      },
    }),

  subtasks: (taskId: string) =>
    queryOptions({
      queryKey: taskKeys.subtasks(taskId),
      queryFn: async () => {
        const res = await api.tasks[':id'].subtasks.$get({ param: { id: taskId } })
        if (!res.ok) throw new Error('Failed to fetch subtasks')
        const json = await res.json()
        return json.data as Subtask[]
      },
      enabled: !!taskId,
    }),
}

export function useCreateTask() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (data: CreateTaskInput) => {
      const res = await api.tasks.$post({ json: data })
      if (!res.ok) throw new Error('Failed to create task')
      const json = await res.json()
      return json.data as Task
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: taskKeys.list() })
    },
  })
}

export function useUpdateTask() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({ id, data }: { id: string; data: UpdateTaskInput }) => {
      const res = await api.tasks[':id'].$patch({ param: { id }, json: data })
      if (!res.ok) throw new Error('Failed to update task')
      const json = await res.json()
      return json.data as Task
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: taskKeys.list() })
      qc.invalidateQueries({ queryKey: taskKeys.today() })
    },
  })
}

export function useDeleteTask() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (id: string) => {
      const res = await api.tasks[':id'].$delete({ param: { id } })
      if (!res.ok) throw new Error('Failed to delete task')
      return res.json()
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: taskKeys.all })
    },
  })
}

export function useCreateSubtask() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({ taskId, data }: { taskId: string; data: CreateSubtaskInput }) => {
      const res = await api.tasks[':id'].subtasks.$post({ param: { id: taskId }, json: data })
      if (!res.ok) throw new Error('Failed to create subtask')
      const json = await res.json()
      return json.data as Subtask
    },
    onSuccess: (_, { taskId }) => {
      qc.invalidateQueries({ queryKey: taskKeys.subtasks(taskId) })
    },
  })
}

export function useUpdateSubtask() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({
      taskId,
      subId,
      data,
    }: {
      taskId: string
      subId: string
      data: UpdateSubtaskInput
    }) => {
      const res = await api.tasks[':id'].subtasks[':subId'].$patch({
        param: { id: taskId, subId },
        json: data,
      })
      if (!res.ok) throw new Error('Failed to update subtask')
      const json = await res.json()
      return json.data as Subtask
    },
    onSuccess: (_, { taskId }) => {
      qc.invalidateQueries({ queryKey: taskKeys.subtasks(taskId) })
    },
  })
}

export function useDeleteSubtask() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({ taskId, subId }: { taskId: string; subId: string }) => {
      const res = await api.tasks[':id'].subtasks[':subId'].$delete({
        param: { id: taskId, subId },
      })
      if (!res.ok) throw new Error('Failed to delete subtask')
      return res.json()
    },
    onSuccess: (_, { taskId }) => {
      qc.invalidateQueries({ queryKey: taskKeys.subtasks(taskId) })
    },
  })
}
