import { CryptoHasher } from 'bun'

import type { AccessTokenPayload, RefreshTokenPayload } from '@habit-tracker/shared/'

import type { Context } from 'hono'
import { deleteCookie, getCookie, setCookie } from 'hono/cookie'
import { sign, verify } from 'hono/jwt'
import z from 'zod'

import type { AppEnv } from '../../app-env'

export const JWT_CONFIG = {
  accessTokenExpiry: 15 * 60, // 15 minutes
  refreshTokenExpiry: 7 * 24 * 60 * 60, // 7 jours
} as const

export async function generateAccessToken(userId: string, secret: string): Promise<string> {
  const now = Math.floor(Date.now() / 1000)
  return sign(
    {
      sub: userId,
      type: 'access',
      jti: crypto.randomUUID(),
      iat: now,
      exp: now + JWT_CONFIG.accessTokenExpiry,
    } satisfies AccessTokenPayload,
    secret
  )
}

export async function generateRefreshToken(
  userId: string,
  secret: string
): Promise<{ token: string; jti: string; expiresAt: Date }> {
  const now = Math.floor(Date.now() / 1000)
  const jti = crypto.randomUUID()

  const token = await sign(
    {
      sub: userId,
      type: 'refresh',
      jti,
      iat: now,
      exp: now + JWT_CONFIG.refreshTokenExpiry,
    } satisfies RefreshTokenPayload,
    secret
  )

  return {
    token,
    jti,
    expiresAt: new Date((now + JWT_CONFIG.refreshTokenExpiry) * 1000),
  }
}

export async function verifyAccessToken(
  token: string,
  secret: string
): Promise<AccessTokenPayload | null> {
  try {
    const raw = await verify(token, secret, 'HS256')
    const payload = raw as unknown as AccessTokenPayload
    if (payload.type !== 'access') return null
    return payload
  } catch {
    return null
  }
}

// export async function verifyRefreshToken(token: string, secret: string) {
//   try {
//     const raw = await verify(token, secret, 'HS256')
//     // const payload = raw as unknown as RefreshTokenPayload
//     if (raw.type !== 'refresh') return null
//     return raw
//   } catch {
//     return null
//   }
// }

const refreshTokenPayloadSchema = z.object({
  sub: z.string(),
  type: z.literal('refresh'),
  jti: z.string(),
  iat: z.number(),
  exp: z.number(),
})

export async function verifyRefreshToken(
  token: string,
  secret: string
): Promise<RefreshTokenPayload | null> {
  try {
    const raw = await verify(token, secret, 'HS256')
    const parsed = refreshTokenPayloadSchema.safeParse(raw)
    return parsed.success ? parsed.data : null
  } catch {
    return null
  }
}

export async function extractRefreshToken(c: Context<AppEnv>): Promise<string | null> {
  //  Cookie (priorité pour web)
  const fromCookie = getCookie(c, 'refresh_token')
  if (fromCookie) return fromCookie

  //  Body JSON (mobile) - vérifier Content-Type
  const contentType = c.req.header('Content-Type')
  if (contentType?.includes('application/json')) {
    try {
      const body = await c.req.json<{ refreshToken?: string }>()
      return body.refreshToken ?? null
    } catch {
      return null
    }
  }

  return null
}

export function setRefreshTokenCookie(
  c: Context<AppEnv>,
  token: string,
  env: 'development' | 'production'
) {
  const isProd = env === 'production'
  setCookie(c, 'refresh_token', token, {
    httpOnly: true,
    secure: isProd,
    sameSite: 'Lax',
    path: '/api/auth',
    maxAge: JWT_CONFIG.refreshTokenExpiry,
  })
}

export function clearRefreshTokenCookie(c: Context<AppEnv>) {
  deleteCookie(c, 'refresh_token', { path: '/api/auth' })
}

export function hashJti(jti: string): string {
  const hasher = new CryptoHasher('sha256')
  hasher.update(jti)
  return hasher.digest('base64url')
}
