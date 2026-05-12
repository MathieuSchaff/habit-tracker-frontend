/**
 * upload-product-image.ts — Unified pipeline to publish a product image
 * to Bunny CDN and link it in the DB.
 *
 * Replaces ad-hoc fetch-images-<brand>.ts one-shot scripts. Accepts an image
 * from any source (URL, local file, in-memory bytes), normalises to webp,
 * uploads to Bunny `products/<slug>.webp`, updates products.image_url.
 *
 * Required env (when calling apply mode):
 *   BUNNY_STORAGE_ZONE
 *   BUNNY_STORAGE_PASSWORD
 *   IMAGE_CDN_BASE              public CDN base (e.g. https://aurore-cdn.b-cdn.net)
 *   APP_DATABASE_URL (or DATABASE_URL)
 *
 * Optional env:
 *   BUNNY_STORAGE_HOSTNAME    default: storage.bunnycdn.com
 *   BUNNY_STORAGE_PREFIX      default: products/
 *
 * The function does NOT regenerate snapshot/data.sql — run `just db-snapshot`
 * after a batch to persist DB changes to the committable snapshot.
 */

import { execFileSync } from 'node:child_process'
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { randomUUIDv7, SQL } from 'bun'

const UA =
  'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/127.0 Safari/537.36'

const SEED_ROOT = join(import.meta.dir, '..', '..')
const SOURCE_DIR = join(SEED_ROOT, 'output', 'images-source')
const NORMALIZED_DIR = join(SEED_ROOT, 'output', 'images-normalized')

export type ImageSource =
  | { type: 'url'; url: string }
  | { type: 'file'; path: string }
  | { type: 'bytes'; bytes: Uint8Array; ext: 'jpg' | 'jpeg' | 'png' | 'webp' }

export interface UploadProductImageInput {
  slug: string
  source: ImageSource
  resizeMax?: number
  quality?: number
  saveStaged?: boolean
  updateDb?: boolean
}

export interface UploadProductImageResult {
  slug: string
  cdnUrl: string
  bytes: number
  bunnyUploaded: boolean
  dbUpdated: boolean
  sourceExt: string
}

export interface UploadServiceOptions {
  dry?: boolean
  bunnyZone?: string
  bunnyHostname?: string
  bunnyPassword?: string
  bunnyPrefix?: string
  cdnBase?: string
  sql?: SQL
}

function resolveConfig(opts: UploadServiceOptions) {
  const zone = opts.bunnyZone ?? process.env.BUNNY_STORAGE_ZONE
  const hostname =
    opts.bunnyHostname ?? process.env.BUNNY_STORAGE_HOSTNAME ?? 'storage.bunnycdn.com'
  const password = opts.bunnyPassword ?? process.env.BUNNY_STORAGE_PASSWORD
  const prefix = `${(opts.bunnyPrefix ?? process.env.BUNNY_STORAGE_PREFIX ?? 'products/').replace(/^\/+|\/+$/g, '')}/`
  const cdnBase = (opts.cdnBase ?? process.env.IMAGE_CDN_BASE ?? '').replace(/\/+$/, '')
  return { zone, hostname, password, prefix, cdnBase }
}

async function readSource(source: ImageSource): Promise<{ bytes: Uint8Array; ext: string }> {
  if (source.type === 'bytes') return { bytes: source.bytes, ext: source.ext }
  if (source.type === 'file') {
    const bytes = new Uint8Array(readFileSync(source.path))
    const ext = source.path.split('.').pop()?.toLowerCase() ?? 'jpg'
    return { bytes, ext }
  }
  const res = await fetch(source.url, { headers: { 'User-Agent': UA } })
  if (!res.ok) throw new Error(`GET ${source.url}: HTTP ${res.status}`)
  const ct = res.headers.get('content-type') ?? ''
  const urlExt = source.url.split('?')[0].split('.').pop()?.toLowerCase() ?? ''
  const ext = ct.includes('png')
    ? 'png'
    : ct.includes('webp')
      ? 'webp'
      : ct.includes('jpeg') || ct.includes('jpg')
        ? 'jpg'
        : ['jpg', 'jpeg', 'png', 'webp'].includes(urlExt)
          ? urlExt
          : 'jpg'
  const bytes = new Uint8Array(await res.arrayBuffer())
  return { bytes, ext }
}

function normaliseToWebp(
  bytes: Uint8Array,
  ext: string,
  slug: string,
  resizeMax: number,
  quality: number,
  saveStaged: boolean
): Uint8Array {
  if (ext === 'webp' && !saveStaged) return bytes
  const tmp = tmpdir()
  const inPath = join(tmp, `${slug}-${randomUUIDv7()}.${ext}`)
  const outPath = saveStaged
    ? join(NORMALIZED_DIR, `${slug}.webp`)
    : join(tmp, `${slug}-${randomUUIDv7()}.webp`)
  if (saveStaged) {
    mkdirSync(SOURCE_DIR, { recursive: true })
    mkdirSync(NORMALIZED_DIR, { recursive: true })
    writeFileSync(join(SOURCE_DIR, `${slug}.${ext}`), bytes)
  }
  writeFileSync(inPath, bytes)
  execFileSync('magick', [
    inPath,
    '-resize',
    `${resizeMax}x${resizeMax}>`,
    '-strip',
    '-quality',
    String(quality),
    outPath,
  ])
  return new Uint8Array(readFileSync(outPath))
}

async function bunnyPut(
  bytes: Uint8Array,
  zone: string,
  hostname: string,
  prefix: string,
  password: string,
  slug: string
): Promise<void> {
  const url = `https://${hostname}/${zone}/${prefix}${slug}.webp`
  const res = await fetch(url, {
    method: 'PUT',
    headers: { AccessKey: password, 'Content-Type': 'image/webp' },
    body: bytes,
  })
  if (!res.ok) throw new Error(`PUT ${slug}.webp: HTTP ${res.status} ${await res.text()}`)
}

export async function uploadProductImage(
  input: UploadProductImageInput,
  opts: UploadServiceOptions = {}
): Promise<UploadProductImageResult> {
  const dry = opts.dry === true
  const saveStaged = input.saveStaged !== false
  const updateDb = input.updateDb !== false
  const resizeMax = input.resizeMax ?? 800
  const quality = input.quality ?? 82

  const { zone, hostname, password, prefix, cdnBase } = resolveConfig(opts)
  if (!cdnBase) throw new Error('missing IMAGE_CDN_BASE')
  if (!dry) {
    if (!zone) throw new Error('missing BUNNY_STORAGE_ZONE')
    if (!password) throw new Error('missing BUNNY_STORAGE_PASSWORD')
  }

  const { bytes: rawBytes, ext } = await readSource(input.source)
  const webpBytes = normaliseToWebp(rawBytes, ext, input.slug, resizeMax, quality, saveStaged)

  const cdnUrl = `${cdnBase}/${prefix}${input.slug}.webp`
  let bunnyUploaded = false
  let dbUpdated = false

  if (!dry) {
    await bunnyPut(webpBytes, zone as string, hostname, prefix, password as string, input.slug)
    bunnyUploaded = true
    if (updateDb) {
      const sql =
        opts.sql ?? new SQL(process.env.APP_DATABASE_URL ?? (process.env.DATABASE_URL as string))
      const result = await sql`UPDATE products SET image_url = ${cdnUrl} WHERE slug = ${input.slug}`
      dbUpdated = (result as { count?: number }).count !== 0
      if (!opts.sql) await sql.close()
    }
  }

  return {
    slug: input.slug,
    cdnUrl,
    bytes: webpBytes.length,
    bunnyUploaded,
    dbUpdated,
    sourceExt: ext,
  }
}
