import { HTTP_STATUS, ok, replaceProductTagsSchema } from '@habit-tracker/shared'

import { zValidator } from '@hono/zod-validator'
import { Hono } from 'hono'
import { z } from 'zod'

import type { AppEnv } from '../../../app-env'
import { requireJwtAuth } from '../../auth/middleware'
import { withRlsContext } from '../../auth/rls-context.middleware'
import { listTagsByProduct, replaceProductTags } from '../../tags/tags.service'

const productParams = z.object({ productId: z.uuid() })

const productTagsApp = new Hono<AppEnv>()

productTagsApp.use('*', async (c, next) => {
  if (c.req.method === 'GET') return next()
  return requireJwtAuth(c, next)
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
    zValidator('param', productParams),
    zValidator('json', replaceProductTagsSchema),
    async (c) => {
      const db = c.get('db')
      const { productId } = c.req.valid('param')
      const { tags } = c.req.valid('json')
      const links = await replaceProductTags(db, productId, tags)
      return c.json(ok(links), HTTP_STATUS.OK)
    }
  )
