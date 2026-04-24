import { Hono } from 'hono'

import type { AppEnv } from '../../app-env'
import { globalErrorHandler } from '../../utils/errors/error-handler'
import { testDb } from '../db.test.config'
import { JWT_SECRET, REFRESH_SECRET } from '../helpers/secrets'

export async function createTestApp() {
  const app = new Hono<AppEnv>()

  app.onError(globalErrorHandler)

  // Dynamically import routes to avoid circular dependencies during test initialization
  const { jwtAuthRoutes } = await import('../../features/auth/routes')
  const { habits } = await import('../../features/habits/routes')
  const { healthRoute } = await import('../../features/health/routes')
  const { ingredientTagRoutes } = await import('../../features/ingredients/ingredient-tags/routes')
  const { ingredientRoutes } = await import('../../features/ingredients/routes')
  const { productIngredientRoutes } = await import(
    '../../features/products/product-ingredients/routes'
  )
  const { productTagRoutes } = await import('../../features/products/product-tags/routes')
  const { productRoutes } = await import('../../features/products/routes')
  const { tagRoutes } = await import('../../features/tags/routes')
  const { profileRoute } = await import('../../features/profile/routes')
  const { taskRoutes } = await import('../../features/tasks/routes')
  const { userProductRoutes } = await import('../../features/user-products/routes')
  const { errorsRoute } = await import('../../features/errors/routes')
  const { productDiscussionRoutes } = await import(
    '../../features/discussions/product-discussion-routes'
  )
  const { ingredientDiscussionRoutes } = await import(
    '../../features/discussions/ingredient-discussion-routes'
  )
  const { articleRoutes } = await import('../../features/blog/routes')

  app.use('*', async (c, next) => {
    c.set('db', testDb)
    c.set('env', 'development')
    c.set('jwtSecret', JWT_SECRET)
    c.set('refreshSecret', REFRESH_SECRET)
    c.set('frontendUrl', 'http://localhost:5173')
    await next()
  })

  // Register all routes.
  // Note: Project has inconsistent test path conventions (/api prefix vs no prefix).
  // This baseline follows the original structure to minimize breakage.
  app
    .route('/auth', jwtAuthRoutes)
    .route('/health', healthRoute)
    .route('/habits', habits)
    .route('/profile', profileRoute)
    .route('/products', productRoutes)
    .route('/products', productIngredientRoutes)
    .route('/products', productTagRoutes)
    .route('/products', productDiscussionRoutes)
    .route('/ingredients', ingredientRoutes)
    .route('/ingredients', ingredientTagRoutes)
    .route('/ingredients', ingredientDiscussionRoutes)
    .route('/tags', tagRoutes)
    .route('/tasks', taskRoutes)
    .route('/user-products', userProductRoutes)
    .route('/errors', errorsRoute)
    .route('/articles', articleRoutes)

  return app
}
