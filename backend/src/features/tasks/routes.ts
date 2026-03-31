import {
  createSubtaskSchema,
  createTaskSchema,
  HTTP_STATUS,
  ok,
  updateSubtaskSchema,
  updateTaskSchema,
} from '@habit-tracker/shared'

import { zValidator } from '@hono/zod-validator'
import { Hono } from 'hono'
import { z } from 'zod'

import type { AppEnv } from '../../app-env'
import { requireJwtAuth } from '../auth/middleware'
import {
  createSubtask,
  createTask,
  deleteSubtask,
  deleteTask,
  getActiveTasks,
  getSubtasks,
  getTodayTasks,
  updateSubtask,
  updateTask,
} from './service'

const idParam = z.object({ id: z.uuid() })
const subIdParam = z.object({ id: z.uuid(), subId: z.uuid() })

const app = new Hono<AppEnv>()

app.use('*', requireJwtAuth)

export const taskRoutes = app
  .get('/', async (c) => {
    const db = c.get('db')
    const userId = c.get('userId')
    const result = await getActiveTasks(userId, db)
    return c.json(ok(result), HTTP_STATUS.OK)
  })

  .get('/today', async (c) => {
    const db = c.get('db')
    const userId = c.get('userId')
    const result = await getTodayTasks(userId, db)
    return c.json(ok(result), HTTP_STATUS.OK)
  })

  .post('/', zValidator('json', createTaskSchema), async (c) => {
    const db = c.get('db')
    const input = c.req.valid('json')
    const userId = c.get('userId')
    const task = await createTask(input, userId, db)
    return c.json(ok(task), HTTP_STATUS.CREATED)
  })

  .patch('/:id', zValidator('param', idParam), zValidator('json', updateTaskSchema), async (c) => {
    const db = c.get('db')
    const { id } = c.req.valid('param')
    const userId = c.get('userId')
    const input = c.req.valid('json')
    const task = await updateTask(id, userId, input, db)
    return c.json(ok(task), HTTP_STATUS.OK)
  })

  .delete('/:id', zValidator('param', idParam), async (c) => {
    const db = c.get('db')
    const { id } = c.req.valid('param')
    const userId = c.get('userId')
    await deleteTask(id, userId, db)
    return c.json(ok(null), HTTP_STATUS.OK)
  })

  .get('/:id/subtasks', zValidator('param', idParam), async (c) => {
    const db = c.get('db')
    const { id } = c.req.valid('param')
    const result = await getSubtasks(id, db)
    return c.json(ok(result), HTTP_STATUS.OK)
  })

  .post(
    '/:id/subtasks',
    zValidator('param', idParam),
    zValidator('json', createSubtaskSchema),
    async (c) => {
      const db = c.get('db')
      const { id } = c.req.valid('param')
      const input = c.req.valid('json')
      const subtask = await createSubtask(id, input, db)
      return c.json(ok(subtask), HTTP_STATUS.CREATED)
    }
  )

  .patch(
    '/:id/subtasks/:subId',
    zValidator('param', subIdParam),
    zValidator('json', updateSubtaskSchema),
    async (c) => {
      const db = c.get('db')
      const { subId } = c.req.valid('param')
      const input = c.req.valid('json')
      const subtask = await updateSubtask(subId, input, db)
      return c.json(ok(subtask), HTTP_STATUS.OK)
    }
  )

  .delete('/:id/subtasks/:subId', zValidator('param', subIdParam), async (c) => {
    const db = c.get('db')
    const { subId } = c.req.valid('param')
    await deleteSubtask(subId, db)
    return c.json(ok(null), HTTP_STATUS.OK)
  })
