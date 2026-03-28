import type {
  CreateSubtaskInput,
  CreateTaskInput,
  UpdateSubtaskInput,
  UpdateTaskInput,
} from '@habit-tracker/shared'

import { and, asc, eq, isNull, lte, or, sql } from 'drizzle-orm'

import { db } from '../../db'
import type { Database } from '../../db/index'
import {
  type Subtask,
  type SubtaskInsert,
  subtasks,
  type Task,
  type TaskInsert,
  tasks,
} from '../../db/schema/tasks'
import { TaskError } from './task-error'

export async function getActiveTasks(userId: string, database: Database = db): Promise<Task[]> {
  const today = new Date().toISOString().split('T')[0]
  return database
    .select()
    .from(tasks)
    .where(
      and(
        eq(tasks.userId, userId),
        sql`${tasks.status} != 'done'`,
        // I only want tasks that are not snoozed or where the snooze is finished today.
        or(isNull(tasks.snoozedUntil), lte(tasks.snoozedUntil, today))
      )
    )
    .orderBy(asc(tasks.createdAt))
}

export async function getTodayTasks(userId: string, database: Database = db): Promise<Task[]> {
  const today = new Date().toISOString().split('T')[0]
  return database
    .select()
    .from(tasks)
    .where(
      and(
        eq(tasks.userId, userId),
        // I use UTC to be sure the date is the same as the client.
        sql`DATE(${tasks.doneAt} AT TIME ZONE 'UTC') = ${today}::date`
      )
    )
    .orderBy(asc(tasks.doneAt))
}

export async function createTask(
  input: CreateTaskInput,
  userId: string,
  database: Database = db
): Promise<Task> {
  const [task] = await database
    .insert(tasks)
    .values({
      userId,
      title: input.title,
      energy: input.energy ?? null,
    })
    .returning()

  if (!task) throw new TaskError('task_creation_failed')
  return task
}

export async function updateTask(
  taskId: string,
  userId: string,
  input: UpdateTaskInput,
  database: Database = db
): Promise<Task> {
  const existing = await database.query.tasks.findFirst({
    where: and(eq(tasks.id, taskId), eq(tasks.userId, userId)),
  })
  if (!existing) throw new TaskError('task_not_found')

  const updateValues: Partial<TaskInsert> = {}
  if (input.title !== undefined) updateValues.title = input.title
  if (input.energy !== undefined) updateValues.energy = input.energy
  if (input.status !== undefined) {
    updateValues.status = input.status
    // If the user says it is done, I put the date of today.
    if (input.status === 'done') updateValues.doneAt = new Date()
  }
  if (input.snoozedUntil !== undefined) updateValues.snoozedUntil = input.snoozedUntil
  if (input.focusDurationMinutes !== undefined)
    updateValues.focusDurationMinutes = input.focusDurationMinutes

  const [updated] = await database
    .update(tasks)
    .set(updateValues)
    .where(eq(tasks.id, taskId))
    .returning()

  if (!updated) throw new TaskError('task_update_failed')
  return updated
}

export async function deleteTask(
  taskId: string,
  userId: string,
  database: Database = db
): Promise<void> {
  const result = await database
    .delete(tasks)
    .where(and(eq(tasks.id, taskId), eq(tasks.userId, userId)))
    .returning({ id: tasks.id })

  if (result.length === 0) {
    throw new TaskError('task_not_found')
  }
}

export async function getSubtasks(taskId: string, database: Database = db): Promise<Subtask[]> {
  return database
    .select()
    .from(subtasks)
    .where(eq(subtasks.taskId, taskId))
    .orderBy(asc(subtasks.order))
}

export async function createSubtask(
  taskId: string,
  input: CreateSubtaskInput,
  database: Database = db
): Promise<Subtask> {
  const existing = await database
    .select({ count: sql<number>`count(*)` })
    .from(subtasks)
    .where(eq(subtasks.taskId, taskId))

  // I use the count to put the new subtask at the end of the list.
  const order = Number(existing[0]?.count ?? 0)

  const [subtask] = await database
    .insert(subtasks)
    .values({ taskId, title: input.title, order })
    .returning()

  if (!subtask) throw new TaskError('subtask_creation_failed')
  return subtask
}

export async function updateSubtask(
  subtaskId: string,
  input: UpdateSubtaskInput,
  database: Database = db
): Promise<Subtask> {
  const updateValues: Partial<SubtaskInsert> = {}
  if (input.title !== undefined) updateValues.title = input.title
  if (input.completed !== undefined) updateValues.completed = input.completed

  const [updated] = await database
    .update(subtasks)
    .set(updateValues)
    .where(eq(subtasks.id, subtaskId))
    .returning()

  if (!updated) throw new TaskError('subtask_not_found')
  return updated
}

export async function deleteSubtask(subtaskId: string, database: Database = db): Promise<void> {
  const result = await database
    .delete(subtasks)
    .where(eq(subtasks.id, subtaskId))
    .returning({ id: subtasks.id })
  if ((result.length ?? 0) === 0) throw new TaskError('subtask_not_found')
}
