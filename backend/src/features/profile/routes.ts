import { err, errorToStatus, HTTP_STATUS, ok, profileUpdateSchema } from '@habit-tracker/shared'

import { zValidator } from '@hono/zod-validator'
import { Hono } from 'hono'

import type { AppEnv } from '../../app-env'
import { requireJwtAuth } from '../auth/middleware'
import { getProfile, updateProfile } from './service'
import { type MeResponse, profileErrorMapping } from './types'

export const profileRoute = new Hono<AppEnv>()

  .onError((e, c) => {
    console.error('Profile error:', e)
    return c.json<MeResponse>(
      err('server_error', e instanceof Error ? e.message : undefined),
      errorToStatus('server_error', profileErrorMapping)
    )
  })

  .use('*', requireJwtAuth)

  .get('/', async (c) => {
    const db = c.get('db')
    const userId = c.get('userId')

    const profile = await getProfile(db, userId)
    if (!profile) {
      return c.json<MeResponse>(err('not_found'), errorToStatus('not_found', profileErrorMapping))
    }

    return c.json<MeResponse>(ok(profile), HTTP_STATUS.OK)
  })

  .patch('/', zValidator('json', profileUpdateSchema), async (c) => {
    const db = c.get('db')
    const userId = c.get('userId')

    const data = c.req.valid('json')
    const updated = await updateProfile(db, userId, data)

    if (!updated) {
      return c.json<MeResponse>(err('not_found'), errorToStatus('not_found', profileErrorMapping))
    }

    return c.json<MeResponse>(ok(updated), HTTP_STATUS.OK)
  })
