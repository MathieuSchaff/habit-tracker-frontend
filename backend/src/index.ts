const port = Number(process.env.PORT ?? 3000)

import { Hono } from 'hono'
import { cors } from 'hono/cors'

import type { AppEnv } from './app-env'
import { env } from './config/env'
import { db } from './db/index'
import { jwtAuthRoutes } from './features/auth'
import { habits } from './features/habits/routes'
import { healthRoute } from './features/health/routes'
import { logsRoutes } from './features/logs'
import { productRoutes } from './features/products'
import { ingredientTagRoutes } from './features/products/ingredient-tags/routes'
import { productTagRoutes } from './features/products/product-tags/routes'
import { ingredientRoutes } from './features/products/ingredients/routes'
import { productIngredientRoutes } from './features/products/product-ingredients/routes'
import { tagRoutes } from './features/products/tags/routes'
import { profileRoute } from './features/profile'
import { stockRoutes } from './features/stock'
import { taskRoutes } from './features/tasks/routes'
import { userProductRoutes } from './features/user-products'

console.log(`API listening on ${port}`)
const app = new Hono<AppEnv>()

app.use(
  '*',
  cors({
    origin: 'http://localhost:5173', // ← à adapter en prod (ou utiliser une liste / regex)
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
  await next()
})

const routes = app
  .route('/api/auth', jwtAuthRoutes)
  .route('/api/health', healthRoute)
  .route('/api/habits', habits)
  .route('/api/profile', profileRoute)
  .route('/api/products', productRoutes)
  .route('/api/products', productIngredientRoutes)
  .route('/api/products', productTagRoutes)
  .route('/api/ingredients', ingredientRoutes)
  .route('/api/ingredients', ingredientTagRoutes)
  .route('/api/tags', tagRoutes)
  .route('/api/stock', stockRoutes)
  .route('/api/logs', logsRoutes)
  .route('/api/tasks', taskRoutes)
  .route('/api/user-products', userProductRoutes)

export type AppType = typeof routes
export default { port, fetch: app.fetch }
