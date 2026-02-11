const port = Number(process.env.PORT ?? 3000)

import { Hono } from 'hono'
import { cors } from 'hono/cors'

import type { AppEnv } from './app-env'
import { env } from './config/env'
import { db } from './db/index'
import { jwtAuthRoutes } from './features/auth'
import { healthRoute } from './features/health/routes'
// import { habits } from "./features/habits/routes";
import { profileRoute } from './features/profile'

const app = new Hono<AppEnv>()
  .basePath('/api')
  .use('*', cors({ credentials: true, origin: 'http://localhost:5173' }))

  .use('*', async (c, next) => {
    c.set('db', db)
    c.set('env', Bun.env.NODE_ENV === 'production' ? 'production' : 'development')
    c.set('jwtSecret', env.JWT_SECRET)
    c.set('refreshSecret', env.REFRESH_SECRET)
    await next()
  })
  .route('/auth', jwtAuthRoutes)
  .route('/health', healthRoute)
  // .route("/habits", habits)
  .route('/profile', profileRoute)

// Export du type pour le frontend
export type AppType = typeof app

export default {
  port: port,
  fetch: app.fetch,
}

console.log(`API listening on ${port}`)
