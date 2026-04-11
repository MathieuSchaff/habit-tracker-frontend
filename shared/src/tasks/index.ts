import { z } from 'zod'

import { HTTP_STATUS, type HttpStatus } from '../core'

// SCHEMAS

const dateFormat = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Format YYYY-MM-DD requis')

export const createTaskSchema = z.object({
  title: z.string().min(1).max(500),
  energy: z.enum(['low', 'medium', 'high']).optional(),
})

export const updateTaskSchema = z.object({
  title: z.string().min(1).max(500).optional(),
  energy: z.enum(['low', 'medium', 'high']).nullable().optional(),
  status: z.enum(['inbox', 'active', 'done', 'snoozed']).optional(),
  snoozedUntil: dateFormat.nullable().optional(),
  focusDurationMinutes: z.number().int().min(0).optional(),
})

export const createSubtaskSchema = z.object({
  title: z.string().min(1).max(500),
})

export const updateSubtaskSchema = z.object({
  title: z.string().min(1).max(500).optional(),
  completed: z.boolean().optional(),
})

// TYPES

export type CreateTaskInput = z.infer<typeof createTaskSchema>
export type UpdateTaskInput = z.infer<typeof updateTaskSchema>
export type CreateSubtaskInput = z.infer<typeof createSubtaskSchema>
export type UpdateSubtaskInput = z.infer<typeof updateSubtaskSchema>

export type TaskEnergy = 'low' | 'medium' | 'high'
export type TaskStatus = 'inbox' | 'active' | 'done' | 'snoozed'

// Entity Types
// Types standalone mirroring the Drizzle schema.
// Defined here (not imported from backend) to keep shared independent of ORM.

export interface Task {
  id: string
  userId: string
  title: string
  energy: TaskEnergy | null
  status: TaskStatus
  snoozedUntil: string | null // date string YYYY-MM-DD
  doneAt: string | null // ISO timestamp string
  focusDurationMinutes: number | null
  createdAt: string // ISO timestamp string
  updatedAt: string // ISO timestamp string
}

export interface Subtask {
  id: string
  taskId: string
  title: string
  completed: boolean
  order: number
  createdAt: string
}

// Error Codes

export type TaskErrorCode =
  | 'task_not_found'
  | 'task_creation_failed'
  | 'task_update_failed'
  | 'task_delete_failed'
  | 'subtask_not_found'
  | 'subtask_creation_failed'
  | 'subtask_update_failed'
  | 'subtask_delete_failed'
  | 'unauthorized_access'

// HELPERS

export const taskErrorMapping = {
  task_not_found: HTTP_STATUS.NOT_FOUND,
  task_creation_failed: HTTP_STATUS.INTERNAL_SERVER_ERROR,
  task_update_failed: HTTP_STATUS.INTERNAL_SERVER_ERROR,
  task_delete_failed: HTTP_STATUS.INTERNAL_SERVER_ERROR,
  subtask_not_found: HTTP_STATUS.NOT_FOUND,
  subtask_creation_failed: HTTP_STATUS.INTERNAL_SERVER_ERROR,
  subtask_update_failed: HTTP_STATUS.INTERNAL_SERVER_ERROR,
  subtask_delete_failed: HTTP_STATUS.INTERNAL_SERVER_ERROR,
  unauthorized_access: HTTP_STATUS.FORBIDDEN,
} as const satisfies Record<TaskErrorCode, HttpStatus>
