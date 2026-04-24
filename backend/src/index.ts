const port = Number(process.env.PORT ?? 3000)

import { Hono } from 'hono'
import { cors } from 'hono/cors'
import { bodyLimit } from 'hono/body-limit'
import { secureHeaders } from 'hono/secure-headers'

import type { AppEnv } from './app-env'
import { env } from './config/env'
import { db } from './db/index'
import { jwtAuthRoutes } from './features/auth'
import { articleRoutes } from './features/blog'
import { ingredientDiscussionRoutes } from './features/discussions/ingredient-discussion-routes'
import { errorsRoute } from './features/errors'
import { habits } from './features/habits/routes'
import { healthRoute } from './features/health/routes'
import { ingredientTagRoutes } from './features/ingredients/ingredient-tags/routes'
import { ingredientRoutes } from './features/ingredients/routes'
import { productsFeature } from './features/products'
import { profileRoute } from './features/profile'
import { tagRoutes } from './features/tags/routes'
import { taskRoutes } from './features/tasks/routes'
import { userProductRoutes } from './features/user-products'
import { logger } from './lib/logger'
import { globalErrorHandler } from './utils/errors/error-handler'

logger.info(`API listening on ${port}`)
const app = new Hono<AppEnv>()

app.onError(globalErrorHandler)

app.use(secureHeaders())
app.use(bodyLimit({ maxSize: 1024 * 1024 }))
app.use(
  '*',
  cors({
    origin: env.FRONTEND_URL,
    credentials: true,
    allowHeaders: ['Content-Type', 'Authorization'],
    allowMethods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    exposeHeaders: ['Content-Length', 'X-Request-Id'],
    maxAge: 600,
  })
)
app.use('*', async (c, next) => {
  c.set('db', db)
  c.set('env', Bun.env.NODE_ENV === 'production' ? 'production' : 'development')
  c.set('jwtSecret', env.JWT_SECRET)
  c.set('refreshSecret', env.REFRESH_SECRET)
  c.set('frontendUrl', env.FRONTEND_URL)
  await next()
})

app.use('*', async (c, next) => {
  const start = Date.now()
  await next()
  logger.info({
    method: c.req.method,
    path: c.req.path,
    status: c.res.status,
    ms: Date.now() - start,
  })
})

const routes = app
  .route('/api/auth', jwtAuthRoutes)
  .route('/api/health', healthRoute)
  .route('/api/habits', habits)
  .route('/api/profile', profileRoute)
  .route('/api', productsFeature)
  .route('/api/ingredients', ingredientRoutes)
  .route('/api/ingredients', ingredientTagRoutes)
  .route('/api/ingredients', ingredientDiscussionRoutes)
  .route('/api/tags', tagRoutes)
  .route('/api/tasks', taskRoutes)
  .route('/api/user-products', userProductRoutes)
  .route('/api/errors', errorsRoute)
  .route('/api/articles', articleRoutes)

app.notFound((c) => c.json({ success: false, error: 'not_found' }, 404))

export type AppType = typeof routes
export default { port, fetch: app.fetch }
