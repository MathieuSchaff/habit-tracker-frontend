export interface BunnyConfig {
  zone?: string
  hostname: string
  password?: string
  prefix: string
  cdnBase: string
}

export interface BunnyItem {
  ObjectName: string
  IsDirectory: boolean
  Length: number
}

export function resolveBunnyConfig(overrides: Partial<BunnyConfig> = {}): BunnyConfig {
  return {
    zone: overrides.zone ?? process.env.BUNNY_STORAGE_ZONE,
    hostname: overrides.hostname ?? process.env.BUNNY_STORAGE_HOSTNAME ?? 'storage.bunnycdn.com',
    password: overrides.password ?? process.env.BUNNY_STORAGE_PASSWORD,
    prefix: `${(overrides.prefix ?? process.env.BUNNY_STORAGE_PREFIX ?? 'products/').replace(/^\/+|\/+$/g, '')}/`,
    cdnBase: (overrides.cdnBase ?? process.env.IMAGE_CDN_BASE ?? '').replace(/\/+$/, ''),
  }
}

function fileUrl(cfg: BunnyConfig, file: string): string {
  return `https://${cfg.hostname}/${cfg.zone}/${cfg.prefix}${file}`
}

function authHeaders(cfg: BunnyConfig): Record<string, string> {
  if (!cfg.password) throw new Error('missing BUNNY_STORAGE_PASSWORD')
  return { AccessKey: cfg.password }
}

export async function listBunny(cfg: BunnyConfig): Promise<BunnyItem[]> {
  const res = await fetch(`https://${cfg.hostname}/${cfg.zone}/${cfg.prefix}`, {
    headers: authHeaders(cfg),
  })
  if (!res.ok) throw new Error(`bunny list: HTTP ${res.status}`)
  return (await res.json()) as BunnyItem[]
}

export async function getBunny(cfg: BunnyConfig, file: string): Promise<Uint8Array> {
  const res = await fetch(fileUrl(cfg, file), { headers: authHeaders(cfg) })
  if (!res.ok) throw new Error(`GET ${file}: HTTP ${res.status}`)
  return new Uint8Array(await res.arrayBuffer())
}

export async function putBunny(
  cfg: BunnyConfig,
  file: string,
  body: Uint8Array,
  contentType = 'image/webp'
): Promise<void> {
  const res = await fetch(fileUrl(cfg, file), {
    method: 'PUT',
    headers: { ...authHeaders(cfg), 'Content-Type': contentType },
    body,
  })
  if (!res.ok) throw new Error(`PUT ${file}: HTTP ${res.status} ${await res.text()}`)
}

export async function deleteBunny(cfg: BunnyConfig, file: string): Promise<'deleted' | 'notFound'> {
  const res = await fetch(fileUrl(cfg, file), { method: 'DELETE', headers: authHeaders(cfg) })
  if (res.status === 404) return 'notFound'
  if (!res.ok) throw new Error(`DELETE ${file}: HTTP ${res.status}`)
  return 'deleted'
}
