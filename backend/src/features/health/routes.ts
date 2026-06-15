import { err, HTTP_STATUS, ok } from '@aurore/shared'

import { sql } from 'drizzle-orm'
import { Hono } from 'hono'

import type { AppEnv } from '../../app-env'

// Liveness: process is up. Used by the container healthcheck — must NOT depend on
// the DB, or a DB outage would keep the container "unhealthy" and stop nginx booting.
export const healthRoute = new Hono<AppEnv>().get('/', (c) => {
  return c.json(ok(true), HTTP_STATUS.OK)
})

// Readiness: the app can serve real traffic (DB reachable). For monitoring, not the
// container probe. 503 lets an uptime check distinguish "up but degraded" from "down".
export const readyRoute = new Hono<AppEnv>().get('/', async (c) => {
  try {
    await c.get('db').execute(sql`SELECT 1`)
    return c.json(ok(true), HTTP_STATUS.OK)
  } catch {
    return c.json(err('db_unreachable'), HTTP_STATUS.SERVICE_UNAVAILABLE)
  }
})
