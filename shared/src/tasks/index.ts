import { z } from 'zod'

import { HTTP_STATUS, type HttpStatus } from '../core'

// SCHEMAS

// snoozedUntil is a calendar date but travels as ISO datetime UTC on the wire.
// Backend boundary truncates to YYYY-MM-DD for the `date` column.
const instantSchema = z.iso.datetime()

export const createTaskSchema = z.object({
  title: z.string().min(1).max(500),
  energy: z.enum(['low', 'medium', 'high']).optional(),
})

export const updateTaskSchema = z.object({
  title: z.string().min(1).max(500).optional(),
  energy: z.enum(['low', 'medium', 'high']).nullable().optional(),
  status: z.enum(['inbox', 'active', 'done', 'snoozed']).optional(),
  snoozedUntil: instantSchema.nullable().optional(),
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

// Entity schemas
// Mirrors the Drizzle schema, but kept Zod here to keep shared independent of
// the ORM. Used by backend devAssertSchema for response shape validation.

export const taskSchema = z.object({
  id: z.uuid(),
  userId: z.uuid(),
  title: z.string(),
  energy: z.enum(['low', 'medium', 'high']).nullable(),
  status: z.enum(['inbox', 'active', 'done', 'snoozed']),
  snoozedUntil: instantSchema.nullable(),
  doneAt: instantSchema.nullable(),
  focusDurationMinutes: z.number().int().nullable(),
  createdAt: instantSchema,
  updatedAt: instantSchema,
})

export const subtaskSchema = z.object({
  id: z.uuid(),
  taskId: z.uuid(),
  title: z.string(),
  completed: z.boolean(),
  order: z.number().int(),
  createdAt: instantSchema,
})

export type Task = z.infer<typeof taskSchema>
export type Subtask = z.infer<typeof subtaskSchema>

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
