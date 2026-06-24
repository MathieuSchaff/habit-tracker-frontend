import { err, HTTP_STATUS, ok, uploadErrorMapping } from '@aurore/shared'

import { type Context, Hono } from 'hono'
import { bodyLimit } from 'hono/body-limit'
import { z } from 'zod'

import type { AppEnv } from '../../app-env'
import { zValidator } from '../../utils/validator'
import {
  getAuthedUserId,
  requireCatalogWrite,
  requireJwtAuth,
  requireNotBanned,
  requireNotBannedScope,
} from '../auth/middleware'
import { withRlsContext } from '../auth/rls-context.middleware'
import { uploadAvatar, uploadProductImage } from './service'
import { UploadError } from './upload-error'

const app = new Hono<AppEnv>()

app.use('*', requireJwtAuth)
app.use('*', requireNotBanned)
app.use('*', withRlsContext)
app.use('*', bodyLimit({ maxSize: 1_048_576 }))

function handleUploadError(c: Context<AppEnv>, e: unknown) {
  if (e instanceof UploadError) {
    if (e.code === 'not_found') return c.json(err('not_found'), HTTP_STATUS.NOT_FOUND)
    return c.json(err(e.code), uploadErrorMapping[e.code])
  }
  throw e
}

export const uploadsRoutes = app
  .post('/avatar', async (c) => {
    const userId = getAuthedUserId(c)
    const body = await c.req.parseBody()
    const file = body.image
    if (!(file instanceof File)) {
      return c.json(err('upload_invalid_format'), HTTP_STATUS.BAD_REQUEST)
    }
    const buffer = Buffer.from(await file.arrayBuffer())
    try {
      const result = await uploadAvatar(c.get('db'), userId, buffer)
      return c.json(ok(result), HTTP_STATUS.CREATED)
    } catch (e) {
      return handleUploadError(c, e)
    }
  })
  .post(
    '/product/:slug',
    requireNotBannedScope('product_edit'),
    requireCatalogWrite,
    zValidator(
      'param',
      z.object({ slug: z.string().regex(/^[a-z0-9][a-z0-9-]{0,198}[a-z0-9]$|^[a-z0-9]$/) })
    ),
    async (c) => {
      const { slug } = c.req.valid('param')
      const body = await c.req.parseBody()
      const file = body.image
      if (!(file instanceof File)) {
        return c.json(err('upload_invalid_format'), HTTP_STATUS.BAD_REQUEST)
      }
      const buffer = Buffer.from(await file.arrayBuffer())
      try {
        const result = await uploadProductImage(c.get('db'), slug, buffer)
        return c.json(ok(result), HTTP_STATUS.CREATED)
      } catch (e) {
        return handleUploadError(c, e)
      }
    }
  )
