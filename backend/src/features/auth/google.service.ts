import type { GoogleCallbackResult } from '@habit-tracker/shared'
import { err, ok } from '@habit-tracker/shared'

import { decodeIdToken, generateCodeVerifier, generateState, type OAuth2Tokens } from 'arctic'
import { eq } from 'drizzle-orm'

import { users } from '../../db/schema'
import { google } from '../../lib/artic'
import { type AuthContext, createTokenPair } from './service'
import { createProfile, createUser, getUser, toPublicUser } from './user.utils'

export function getGoogleAuthUrl(): { url: string; state: string; codeVerifier: string } {
  const state = generateState()
  const codeVerifier = generateCodeVerifier()
  const url = google.createAuthorizationURL(state, codeVerifier, ['openid', 'profile', 'email'])
  return { url: url.toString(), state, codeVerifier }
}

export async function handleGoogleCallback(
  ctx: AuthContext,
  code: string,
  codeVerifier: string
): Promise<GoogleCallbackResult> {
  try {
    const tokens: OAuth2Tokens = await google.validateAuthorizationCode(code, codeVerifier)
    const claims = decodeIdToken(tokens.idToken()) as {
      sub: string
      email: string
      picture?: string
    }

    const { sub: googleSub, email, picture } = claims

    // 1. User existant via googleSub
    const [existingByGoogle] = await ctx.db
      .select()
      .from(users)
      .where(eq(users.googleSub, googleSub))
      .limit(1)

    if (existingByGoogle) {
      const tokenPair = await createTokenPair(ctx, existingByGoogle.id)
      return ok({ user: toPublicUser(existingByGoogle), ...tokenPair })
    }

    // 2. Account linking — compte local avec même email
    const existingByEmail = await getUser(ctx.db, email)

    if (existingByEmail) {
      await ctx.db.update(users).set({ googleSub }).where(eq(users.id, existingByEmail.id))
      const tokenPair = await createTokenPair(ctx, existingByEmail.id)
      return ok({ user: toPublicUser(existingByEmail), ...tokenPair })
    }

    // 3. Nouveau user
    const user = await ctx.db.transaction(async (tx) => {
      const newUser = await createUser(tx, {
        email: email as any,
        passwordHash: null,
        emailVerifiedAt: new Date(),
      })
      await tx.update(users).set({ googleSub }).where(eq(users.id, newUser.id))
      await createProfile(tx, newUser.id, { avatarUrl: picture ?? null })
      return newUser
    })

    const tokenPair = await createTokenPair(ctx, user.id)
    return ok({ user: toPublicUser(user), ...tokenPair })
  } catch (e) {
    console.error('Google callback failed:', e)
    return err('server_error')
  }
}
