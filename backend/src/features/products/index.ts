import { Hono } from 'hono'

import type { AppEnv } from '../../app-env'
import { productDiscussionRoutes } from '../discussions/product-discussion-routes'
import { productIngredientRoutes } from './product-ingredients/routes'
import { productTagRoutes } from './product-tags/routes'
import { productRoutes } from './routes'

const productsFeature = new Hono<AppEnv>()
  .route('/products', productRoutes)
  .route('/products', productIngredientRoutes)
  .route('/products', productTagRoutes)
  .route('/products', productDiscussionRoutes)

export { productsFeature }
