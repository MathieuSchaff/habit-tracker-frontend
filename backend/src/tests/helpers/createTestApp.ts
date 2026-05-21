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
  const { healthRoute } = await import('../../features/health/routes')
  const { ingredientTagRoutes } = await import('../../features/ingredients/ingredient-tags/routes')
  const { ingredientRoutes } = await import('../../features/ingredients/routes')
  const { productIngredientRoutes } = await import(
    '../../features/products/product-ingredients/routes'
  )
  const { productTagRoutes } = await import('../../features/products/product-tags/routes')
  const { productRoutes } = await import('../../features/products/routes')
  const { productComparisonRoutes } = await import('../../features/product-comparisons/routes')
  const { productTagDefRoutes } = await import('../../features/product-tags/routes')
  const { ingredientTagDefRoutes } = await import('../../features/ingredient-tags/routes')
  const { profileRoute } = await import('../../features/profile/routes')
  const { publicProfileRoutes } = await import('../../features/profile/public-routes')
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
  const { uploadsRoutes } = await import('../../features/uploads/routes')
  const { adminBansRoutes } = await import('../../features/admin/bans.routes')
  const { adminModerationRoutes } = await import('../../features/admin/moderation.routes')
  const { adminReportsRoutes } = await import('../../features/admin/reports.routes')
  const { reportsRoutes } = await import('../../features/reports/routes')

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
  // Chain reassigned to preserve route types for testClient<typeof app>() RPC inference.
  const routedApp = app
    .route('/auth', jwtAuthRoutes)
    .route('/health', healthRoute)
    .route('/profile', profileRoute)
    .route('/profiles', publicProfileRoutes)
    .route('/products', productRoutes)
    .route('/products', productIngredientRoutes)
    .route('/products', productTagRoutes)
    .route('/products', productDiscussionRoutes)
    .route('/product-comparisons', productComparisonRoutes)
    .route('/ingredients', ingredientRoutes)
    .route('/ingredients', ingredientTagRoutes)
    .route('/ingredients', ingredientDiscussionRoutes)
    .route('/product-tags', productTagDefRoutes)
    .route('/ingredient-tags', ingredientTagDefRoutes)
    .route('/tasks', taskRoutes)
    .route('/user-products', userProductRoutes)
    .route('/errors', errorsRoute)
    .route('/articles', articleRoutes)
    .route('/api/uploads', uploadsRoutes)
    .route('/admin', adminBansRoutes)
    .route('/admin/moderation', adminModerationRoutes)
    .route('/admin/reports', adminReportsRoutes)
    .route('/api/reports', reportsRoutes)

  return routedApp
}

export type TestAppType = Awaited<ReturnType<typeof createTestApp>>
