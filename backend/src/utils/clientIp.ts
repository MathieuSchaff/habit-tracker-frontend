import type { Context } from 'hono'

// Trust only headers our nginx edge sets:
//   X-Real-IP $remote_addr           — real TCP peer, overwrites any client value
//   X-Forwarded-For $proxy_add_...   — nginx appends the peer at the END of the list
// The leftmost X-Forwarded-For entry is client-controlled: never key a rate limit
// or audit trail on it, or it can be rotated to bypass limits / poison logs.
// cf-connecting-ip is spoofable until we sit behind Cloudflare — re-add it here then.
export function clientIp(c: Context): string {
  return (
    c.req.header('x-real-ip')?.trim() ||
    c.req.header('x-forwarded-for')?.split(',').at(-1)?.trim() ||
    'unknown'
  )
}
