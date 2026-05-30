import { HTTP_STATUS, ok, replaceProductTagsSchema } from '@aurore/shared'

import { Hono } from 'hono'
import { z } from 'zod'

import type { AppEnv } from '../../../app-env'
import { zValidator } from '../../../utils/validator'
import {
  requireCatalogWrite,
  requireJwtAuth,
  requireNotBanned,
  requireNotBannedScope,
} from '../../auth/middleware'
import { withRlsContext } from '../../auth/rls-context.middleware'
import { listTagsByProduct, replaceProductTags } from '../../product-tags/service'
import { assertTagsMatchProductDomain } from './domain-validation'

const productParams = z.object({ productId: z.uuid() })

const productTagsApp = new Hono<AppEnv>()

// One guard per use(): nesting swallows the short-circuit 403 → "Context not finalized" 500.
productTagsApp.use('*', async (c, next) => {
  return c.req.method === 'GET' ? next() : requireJwtAuth(c, next)
})
productTagsApp.use('*', async (c, next) => {
  return c.req.method === 'GET' ? next() : requireNotBanned(c, next)
})
productTagsApp.use('*', withRlsContext)

export const productTagRoutes = productTagsApp

  .get('/:productId/tags', zValidator('param', productParams), async (c) => {
    const db = c.get('db')
    const { productId } = c.req.valid('param')
    const items = await listTagsByProduct(db, productId)
    return c.json(ok(items), HTTP_STATUS.OK)
  })

  .put(
    '/:productId/tags',
    requireNotBannedScope('product_edit'),
    requireCatalogWrite,
    zValidator('param', productParams),
    zValidator('json', replaceProductTagsSchema),
    async (c) => {
      const db = c.get('db')
      const { productId } = c.req.valid('param')
      const { tags } = c.req.valid('json')
      const tagIds = tags.map((t) => (typeof t === 'string' ? t : t.tagId))
      await assertTagsMatchProductDomain(db, productId, tagIds)
      const links = await replaceProductTags(db, productId, tags)
      return c.json(ok(links), HTTP_STATUS.OK)
    }
  )
