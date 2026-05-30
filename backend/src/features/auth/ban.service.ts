import type { BanScope } from '@aurore/shared'

import { and, desc, eq, gt, isNull, or } from 'drizzle-orm'

import type { Database } from '../../db'
import { type UserBan, userBans } from '../../db/schema'

// In-process TTL cache. Admin-pool query bypasses RLS — acceptable here because
// the caller is already authenticated by requireJwtAuth and we only read
// identity-layer state. A 30s TTL bounds the window in which a freshly banned
// user keeps getting through (vs ~15min token lifetime without enforcement).
const CACHE_TTL_MS = 30_000
const CACHE_MAX = 5000

type CacheEntry = { ban: UserBan | null; expiresAt: number }
const cache = new Map<string, CacheEntry>()

function readCache(userId: string): CacheEntry | null {
  const hit = cache.get(userId)
  if (!hit) return null
  if (hit.expiresAt <= Date.now()) {
    cache.delete(userId)
    return null
  }
  return hit
}

function writeCache(userId: string, ban: UserBan | null): void {
  if (cache.size >= CACHE_MAX) {
    // Evict oldest insertion. Map iteration is insertion-ordered.
    const oldest = cache.keys().next().value
    if (oldest !== undefined) cache.delete(oldest)
  }
  cache.set(userId, { ban, expiresAt: Date.now() + CACHE_TTL_MS })
}

// Returns the most recent active ban that covers `scope` (or any active
// 'global' ban). Active means expiresAt IS NULL OR expiresAt > now().
export async function isUserBanned(
  db: Database,
  userId: string,
  scope: 'global' = 'global'
): Promise<UserBan | null> {
  const cached = readCache(userId)
  if (cached) return cached.ban

  const nowIso = new Date().toISOString()
  const rows = await db
    .select()
    .from(userBans)
    .where(
      and(
        eq(userBans.userId, userId),
        eq(userBans.scope, scope),
        or(isNull(userBans.expiresAt), gt(userBans.expiresAt, nowIso))
      )
    )
    .orderBy(desc(userBans.createdAt))
    .limit(1)

  const ban = rows[0] ?? null
  writeCache(userId, ban)
  return ban
}

// Per-scope variant used by requireNotBannedScope (no cache — write paths are
// cold compared to /auth/session, and a per-scope cache key would complicate
// invalidation when bans are created or lifted).
export async function isUserBannedForScope(
  db: Database,
  userId: string,
  scope: BanScope
): Promise<UserBan | null> {
  const nowIso = new Date().toISOString()
  const rows = await db
    .select()
    .from(userBans)
    .where(
      and(
        eq(userBans.userId, userId),
        eq(userBans.scope, scope),
        or(isNull(userBans.expiresAt), gt(userBans.expiresAt, nowIso))
      )
    )
    .orderBy(desc(userBans.createdAt))
    .limit(1)

  return rows[0] ?? null
}

// Test/admin helper: invalidate the cache when a ban is created/lifted out-of-band.
export function clearBanCache(userId?: string): void {
  if (userId) cache.delete(userId)
  else cache.clear()
}

// Test-only observability: count entries in the cache.
export function _banCacheSize(): number {
  return cache.size
}
