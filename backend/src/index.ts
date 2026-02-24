const port = Number(process.env.PORT ?? 3000)

import { swaggerUI } from '@hono/swagger-ui'
import { OpenAPIHono } from '@hono/zod-openapi'
import { cors } from 'hono/cors'

import type { AppEnv } from './app-env'
import { env } from './config/env'
import { db } from './db/index'
import { jwtAuthRoutes } from './features/auth'
// import { habits } from './features/habits/routes'
import { healthRoute } from './features/health/routes'
import { productRoutes } from './features/products'
import { ingredientRoutes } from './features/products/ingredients/routes'
import { ingredientTagRoutes } from './features/products/ingredient-tags/routes'
import { productIngredientRoutes } from './features/products/product-ingredients/routes'
import { tagRoutes } from './features/products/tags/routes'
import { profileRoute } from './features/profile'

console.log(`API listening on ${port}`)
const app = new OpenAPIHono<AppEnv>()

app.use('*', cors({ credentials: true, origin: 'http://localhost:5173' }))
app.use('*', async (c, next) => {
  c.set('db', db)
  c.set('env', Bun.env.NODE_ENV === 'production' ? 'production' : 'development')
  c.set('jwtSecret', env.JWT_SECRET)
  c.set('refreshSecret', env.REFRESH_SECRET)
  await next()
})

app.doc('/doc', { openapi: '3.0.0', info: { title: 'Aurore API', version: '1.0.0' } })
// je fais ça car sinon j'ai un pb de type avec hono rpc
const routes = app
  .get('/ui', swaggerUI({ url: '/doc' }))
  .route('/api/auth', jwtAuthRoutes)
  .route('/api/health', healthRoute)
  // .route('/api/habits', habits)
  .route('/api/profile', profileRoute)
  .route('/api/products', productRoutes)
  .route('/api/products', productIngredientRoutes)
  .route('/api/ingredients', ingredientRoutes)
  .route('/api/ingredients', ingredientTagRoutes)
  .route('/api/tags', tagRoutes)

export type AppType = typeof routes
export default { port, fetch: app.fetch }
