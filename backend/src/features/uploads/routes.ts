import { err, HTTP_STATUS, ok, uploadErrorMapping } from '@habit-tracker/shared'

import { type Context, Hono } from 'hono'
import { bodyLimit } from 'hono/body-limit'

import type { AppEnv } from '../../app-env'
import { requireJwtAuth } from '../auth/middleware'
import { withRlsContext } from '../auth/rls-context.middleware'
import { uploadAvatar, uploadProductImage } from './service'
import { UploadError } from './upload-error'

const app = new Hono<AppEnv>()

app.use('*', requireJwtAuth)
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
    const db = c.get('db')
    const userId = c.get('userId')
    const body = await c.req.parseBody()
    const file = body.image
    if (!(file instanceof File)) {
      return c.json(err('upload_invalid_format'), HTTP_STATUS.BAD_REQUEST)
    }
    const buffer = Buffer.from(await file.arrayBuffer())
    try {
      const result = await uploadAvatar(db, userId, buffer)
      return c.json(ok(result), HTTP_STATUS.CREATED)
    } catch (e) {
      return handleUploadError(c, e)
    }
  })
  .post('/product/:slug', async (c) => {
    const db = c.get('db')
    const slug = c.req.param('slug')
    const body = await c.req.parseBody()
    const file = body.image
    if (!(file instanceof File)) {
      return c.json(err('upload_invalid_format'), HTTP_STATUS.BAD_REQUEST)
    }
    const buffer = Buffer.from(await file.arrayBuffer())
    try {
      const result = await uploadProductImage(db, slug, buffer)
      return c.json(ok(result), HTTP_STATUS.CREATED)
    } catch (e) {
      return handleUploadError(c, e)
    }
  })
