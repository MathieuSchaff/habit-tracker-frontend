import { ok } from '@habit-tracker/shared'

import { Hono } from 'hono'

import type { AppEnv } from '../../app-env'

export const healthRoute = new Hono<AppEnv>().get('/', (c) => {
  return c.json(ok(true), 200)
})
