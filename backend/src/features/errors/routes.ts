import { HTTP_STATUS, ok } from '@habit-tracker/shared'

import { zValidator } from '@hono/zod-validator'
import { Hono } from 'hono'
import { z } from 'zod'

import type { AppEnv } from '../../app-env'
import { rateLimiterFunc } from '../../utils/rateLimiter'
import { trackError } from './service'

const reportErrorSchema = z.object({
  source: z.literal('frontend'),
  message: z.string().min(1).max(1000),
  stack: z.string().max(10000).optional(),
  context: z.record(z.string(), z.unknown()).optional(),
  userId: z.string().uuid().optional(),
})

const app = new Hono<AppEnv>()
app.use('*', rateLimiterFunc)

export const errorsRoute = app.post('/', zValidator('json', reportErrorSchema), async (c) => {
  const db = c.get('db')
  const { source, message, stack, context, userId } = c.req.valid('json')
  await trackError(db, { source, message, stack, context, userId })
  return c.json(ok(null), HTTP_STATUS.OK)
})
