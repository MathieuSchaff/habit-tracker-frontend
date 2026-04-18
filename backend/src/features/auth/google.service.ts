import type { GoogleCallbackResult } from '@habit-tracker/shared'
import { emailSchema, err, ok } from '@habit-tracker/shared'

import { decodeIdToken, generateCodeVerifier, generateState, type OAuth2Tokens } from 'arctic'
import { eq } from 'drizzle-orm'

import { bindRlsContext } from '../../db/rls'
import { users } from '../../db/schema'
import { getGoogleInstance } from '../../lib/artic'
import { type AuthContext, createTokenPair } from './service'
import { createProfile, createUser, getUser, toPublicUser } from './user.utils'

export function getGoogleAuthUrl(): { url: string; state: string; codeVerifier: string } {
  const state = generateState()
  const codeVerifier = generateCodeVerifier()
  const google = getGoogleInstance()
  const url = google.createAuthorizationURL(state, codeVerifier, ['openid', 'profile', 'email'])
  return { url: url.toString(), state, codeVerifier }
}

export async function handleGoogleCallback(
  ctx: AuthContext,
  code: string,
  codeVerifier: string
): Promise<GoogleCallbackResult> {
  try {
    const google = getGoogleInstance()
    const tokens: OAuth2Tokens = await google.validateAuthorizationCode(code, codeVerifier)
    const claims = decodeIdToken(tokens.idToken()) as {
      sub: string
      email: string
      picture?: string
    }

    const { sub: googleSub, email, picture } = claims

    // Check if user already exists via Google account
    const [existingByGoogle] = await ctx.db
      .select()
      .from(users)
      .where(eq(users.googleSub, googleSub))
      .limit(1)

    if (existingByGoogle) {
      const tokenPair = await createTokenPair(ctx, existingByGoogle.id, existingByGoogle.role)
      return ok({ user: toPublicUser(existingByGoogle), ...tokenPair })
    }

    // Link to existing local account with same email
    const existingByEmail = await getUser(ctx.db, email)

    if (existingByEmail) {
      await ctx.db.update(users).set({ googleSub }).where(eq(users.id, existingByEmail.id))
      const tokenPair = await createTokenPair(ctx, existingByEmail.id, existingByEmail.role)
      return ok({ user: toPublicUser(existingByEmail), ...tokenPair })
    }

    // Create new user from Google sign-up
    const user = await ctx.db.transaction(async (tx) => {
      const newUser = await createUser(tx, {
        email: emailSchema.parse(email),
        passwordHash: null,
        emailVerifiedAt: new Date(),
      })
      await tx.update(users).set({ googleSub }).where(eq(users.id, newUser.id))
      // Set RLS context so the profiles insert passes WITH CHECK on app_runtime.
      await bindRlsContext(tx, newUser.id)
      await createProfile(tx, newUser.id, { avatarUrl: picture ?? null })
      return newUser
    })

    const tokenPair = await createTokenPair(ctx, user.id, user.role)
    return ok({ user: toPublicUser(user), ...tokenPair })
  } catch (e) {
    console.error('Google callback failed:', e)
    return err('server_error')
  }
}
