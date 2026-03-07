import {
  err,
  HTTP_STATUS,
  ok,
  profileUpdateSchema,
} from '@habit-tracker/shared'

import { Hono } from 'hono'
import { zValidator } from '@hono/zod-validator'

import type { AppEnv } from '../../app-env'
import { requireJwtAuth } from '../auth/middleware'
import { getProfile, updateProfile } from './service'

const app = new Hono<AppEnv>()

app.use('*', requireJwtAuth)

app.onError((e, c) => {
  console.error('Profile error:', e)
  return c.json(
    err('server_error', e instanceof Error ? e.message : undefined),
    HTTP_STATUS.INTERNAL_SERVER_ERROR
  )
})

export const profileRoute = app

  .get('/', async (c) => {
    const db = c.get('db')
    const userId = c.get('userId')
    console.log(userId)
    const profile = await getProfile(db, userId)

    if (!profile) {
      return c.json(err('not_found'), HTTP_STATUS.NOT_FOUND)
    }

    return c.json(ok(profile), HTTP_STATUS.OK)
  })

  .patch('/', zValidator('json', profileUpdateSchema), async (c) => {
    const db = c.get('db')
    const userId = c.get('userId')

    const data = c.req.valid('json')
    const updated = await updateProfile(db, userId, data)

    if (!updated) {
      return c.json(err('not_found'), HTTP_STATUS.NOT_FOUND)
    }

    return c.json(ok(updated), HTTP_STATUS.OK)
  })
