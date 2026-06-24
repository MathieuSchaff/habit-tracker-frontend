import { eq } from 'drizzle-orm'

import { env } from '../../config/env'
import type { Database } from '../../db/index'
import { products } from '../../db/schema/products'
import { profiles } from '../../db/schema/users'
import { putToBunny } from './bunny-client'
import { UploadError } from './upload-error'
import { validateWebpUpload } from './validate-image'

const AVATAR_MAX_BYTES = 200_000
const PRODUCT_MAX_BYTES = 500_000

// Cache-bust on the row's updatedAt so the CDN-cached image refreshes after a re-upload.
function appendCacheBust(url: string, updatedAt: string): string {
  return `${url}?v=${Math.floor(Date.parse(updatedAt) / 1000)}`
}

export async function uploadAvatar(
  db: Database,
  userId: string,
  buffer: Buffer
): Promise<{ url: string }> {
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
  return { url: appendCacheBust(row.avatarUrl, row.updatedAt) }
}

export async function uploadProductImage(
  db: Database,
  slug: string,
  buffer: Buffer
): Promise<{ url: string }> {
  // Validate before any CDN/DB work so bad images fail fast regardless of slug.
  validateWebpUpload(buffer, { maxBytes: PRODUCT_MAX_BYTES, expectedSize: 1200 })

  const key = `products/${slug}.webp`
  await putToBunny(key, buffer)
  const storedUrl = `${env.IMAGE_CDN_BASE}/${key}`

  // Update DB only if the product exists; pre-creation uploads skip this step.
  const [existing] = await db
    .select({ id: products.id })
    .from(products)
    .where(eq(products.slug, slug))
    .limit(1)
  if (!existing) return { url: storedUrl }

  const [row] = await db
    .update(products)
    .set({ imageUrl: storedUrl })
    .where(eq(products.slug, slug))
    .returning({ imageUrl: products.imageUrl, updatedAt: products.updatedAt })
  if (!row?.imageUrl) throw new UploadError('not_found')
  return { url: appendCacheBust(row.imageUrl, row.updatedAt) }
}
