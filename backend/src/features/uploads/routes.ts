import { err, HTTP_STATUS, ok, uploadErrorMapping } from '@habit-tracker/shared'

import { eq } from 'drizzle-orm'
import { type Context, Hono } from 'hono'
import { bodyLimit } from 'hono/body-limit'

import type { AppEnv } from '../../app-env'
import { env } from '../../config/env'
import { products } from '../../db/schema/products'
import { profiles } from '../../db/schema/users'
import { requireJwtAuth, requireNotBanned } from '../auth/middleware'
import { withRlsContext } from '../auth/rls-context.middleware'
import { putToBunny } from './bunny-client'
import { UploadError } from './upload-error'
import { validateWebpUpload } from './validate-image'

const AVATAR_MAX_BYTES = 200_000
const PRODUCT_MAX_BYTES = 500_000

const app = new Hono<AppEnv>()

app.use('*', requireJwtAuth)
app.use('*', requireNotBanned)
app.use('*', withRlsContext)
app.use('*', bodyLimit({ maxSize: 1_048_576 }))

function appendCacheBust(url: string, updatedAt: string): string {
  return `${url}?v=${Math.floor(new Date(updatedAt).getTime() / 1000)}`
}

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
      const [existing] = await db
        .select({ userId: profiles.userId })
        .from(profiles)
        .where(eq(profiles.userId, userId))
        .limit(1)
      if (!existing) throw new UploadError('not_found')

      validateWebpUpload(buffer, { maxBytes: AVATAR_MAX_BYTES, expectedSize: 1024 })
      const key = `avatars/${userId}.webp`
      await putToBunny(key, buffer)
      const storedUrl = `${env.IMAGE_CDN_BASE}/${key}`
      const [row] = await db
        .update(profiles)
        .set({ avatarUrl: storedUrl })
        .where(eq(profiles.userId, userId))
        .returning({ avatarUrl: profiles.avatarUrl, updatedAt: profiles.updatedAt })
      if (!row?.avatarUrl) throw new UploadError('not_found')
      return c.json(ok({ url: appendCacheBust(row.avatarUrl, row.updatedAt) }), HTTP_STATUS.CREATED)
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
      const [existing] = await db
        .select({ id: products.id })
        .from(products)
        .where(eq(products.slug, slug))
        .limit(1)
      if (!existing) throw new UploadError('not_found')

      validateWebpUpload(buffer, { maxBytes: PRODUCT_MAX_BYTES, expectedSize: 1200 })
      const key = `products/${slug}.webp`
      await putToBunny(key, buffer)
      const storedUrl = `${env.IMAGE_CDN_BASE}/${key}`
      const [row] = await db
        .update(products)
        .set({ imageUrl: storedUrl })
        .where(eq(products.slug, slug))
        .returning({ imageUrl: products.imageUrl, updatedAt: products.updatedAt })
      if (!row?.imageUrl) throw new UploadError('not_found')
      return c.json(ok({ url: appendCacheBust(row.imageUrl, row.updatedAt) }), HTTP_STATUS.CREATED)
    } catch (e) {
      return handleUploadError(c, e)
    }
  })
