import { mock } from 'bun:test'

mock.module('arctic', () => ({
  generateState: mock(() => 'test-state-fixed'),
  generateCodeVerifier: mock(() => 'test-verifier-fixed'),
  decodeIdToken: mock(() => ({
    sub: 'google-sub-abc123',
    email: 'googleuser@example.com',
    picture: 'https://lh3.googleusercontent.com/avatar.jpg',
  })),
}))

mock.module('../../../lib/artic', () => ({
  getGoogleInstance: mock(() => ({
    createAuthorizationURL: mock(
      (_state: string, _verifier: string, _scopes: string[]) =>
        new URL('https://accounts.google.com/o/oauth2/v2/auth?client_id=test-client-id')
    ),
    validateAuthorizationCode: mock(async () => ({ idToken: () => 'fake-google-id-token' })),
  })),
}))

import { describe, expect, it } from 'bun:test'

import { decodeIdToken } from 'arctic'
import { eq } from 'drizzle-orm'

import { profiles, users } from '../../../db/schema'
import { getGoogleInstance } from '../../../lib/artic'
import { createTestUser } from '../../../tests/helpers/test-factories'
import { getGoogleAuthUrl, handleGoogleCallback } from '../google.service'
import { createCtx, testDb } from './auth-test.setup'

describe('getGoogleAuthUrl', () => {
  it('devrait retourner url, state et codeVerifier', () => {
    const result = getGoogleAuthUrl()

    expect(result).toHaveProperty('url')
    expect(result).toHaveProperty('state')
    expect(result).toHaveProperty('codeVerifier')
    expect(typeof result.url).toBe('string')
    expect(typeof result.state).toBe('string')
    expect(typeof result.codeVerifier).toBe('string')
  })

  it('devrait retourner les valeurs du mock pour state et codeVerifier', () => {
    const result = getGoogleAuthUrl()

    expect(result.state).toBe('test-state-fixed')
    expect(result.codeVerifier).toBe('test-verifier-fixed')
  })

  it('devrait retourner une URL Google OAuth valide', () => {
    const result = getGoogleAuthUrl()

    expect(result.url).toContain('accounts.google.com')
  })
})

describe('handleGoogleCallback', () => {
  it('devrait connecter un utilisateur existant via googleSub', async () => {
    const [existingUser] = await testDb
      .insert(users)
      .values({
        email: 'googleuser@example.com',
        googleSub: 'google-sub-abc123',
        passwordHash: null,
        emailVerifiedAt: new Date(),
      })
      .returning()
    await testDb.insert(profiles).values({ userId: existingUser.id })

    const result = await handleGoogleCallback(createCtx(), 'auth-code', 'code-verifier')

    expect(result.success).toBe(true)
    if (!result.success) return
    expect(result.data.user.email).toBe('googleuser@example.com')
    expect(result.data.accessToken).toBeDefined()
    expect(result.data.refreshToken).toBeDefined()
  })

  it('devrait retourner le même utilisateur (pas créer de doublon) si googleSub existe', async () => {
    const [existingUser] = await testDb
      .insert(users)
      .values({
        email: 'googleuser@example.com',
        googleSub: 'google-sub-abc123',
        passwordHash: null,
        emailVerifiedAt: new Date(),
      })
      .returning()
    await testDb.insert(profiles).values({ userId: existingUser.id })

    const result = await handleGoogleCallback(createCtx(), 'auth-code', 'code-verifier')

    expect(result.success).toBe(true)
    if (!result.success) return
    expect(result.data.user.id).toBe(existingUser.id)

    const allUsers = await testDb.select().from(users)
    expect(allUsers).toHaveLength(1)
  })

  it('devrait lier le compte Google à un compte local existant par email', async () => {
    await createTestUser('googleuser@example.com', 'LocalPass123!')

    const result = await handleGoogleCallback(createCtx(), 'auth-code', 'code-verifier')

    expect(result.success).toBe(true)
    if (!result.success) return
    expect(result.data.user.email).toBe('googleuser@example.com')
    expect(result.data.accessToken).toBeDefined()
  })

  it('devrait mettre à jour googleSub en DB pour un compte lié par email', async () => {
    await createTestUser('googleuser@example.com', 'LocalPass123!')

    const result = await handleGoogleCallback(createCtx(), 'auth-code', 'code-verifier')
    expect(result.success).toBe(true)

    const [updated] = await testDb
      .select()
      .from(users)
      .where(eq(users.email, 'googleuser@example.com'))
      .limit(1)

    expect(updated?.googleSub).toBe('google-sub-abc123')
  })

  it('devrait créer un nouvel utilisateur Google avec email pré-vérifié', async () => {
    const result = await handleGoogleCallback(createCtx(), 'auth-code', 'code-verifier')

    expect(result.success).toBe(true)
    if (!result.success) return
    expect(result.data.user.email).toBe('googleuser@example.com')
    expect(result.data.user.emailVerified).toBe(true)
    expect(result.data.accessToken).toBeDefined()
    expect(result.data.refreshToken).toBeDefined()
  })

  it('devrait stocker googleSub et emailVerifiedAt pour le nouvel utilisateur', async () => {
    const result = await handleGoogleCallback(createCtx(), 'auth-code', 'code-verifier')
    expect(result.success).toBe(true)
    if (!result.success) return

    const [newUser] = await testDb
      .select()
      .from(users)
      .where(eq(users.email, 'googleuser@example.com'))
      .limit(1)

    expect(newUser?.googleSub).toBe('google-sub-abc123')
    expect(newUser?.emailVerifiedAt).not.toBeNull()
  })

  it("devrait créer un profil avec l'avatar Google pour le nouvel utilisateur", async () => {
    const result = await handleGoogleCallback(createCtx(), 'auth-code', 'code-verifier')
    expect(result.success).toBe(true)
    if (!result.success) return

    const [profile] = await testDb
      .select()
      .from(profiles)
      .where(eq(profiles.userId, result.data.user.id))
      .limit(1)

    expect(profile).toBeDefined()
    expect(profile?.avatarUrl).toBe('https://lh3.googleusercontent.com/avatar.jpg')
  })

  it("devrait retourner server_error en cas d'erreur réseau Google", async () => {
    ;(getGoogleInstance as ReturnType<typeof mock>).mockReturnValueOnce({
      createAuthorizationURL: () => new URL('https://accounts.google.com'),
      validateAuthorizationCode: async () => {
        throw new Error('Network error: connection refused')
      },
    })

    const result = await handleGoogleCallback(createCtx(), 'invalid-code', 'code-verifier')

    expect(result.success).toBe(false)
    if (result.success) return
    expect(result.error).toBe('server_error')
  })

  it("devrait retourner server_error si l'email Google est invalide", async () => {
    ;(decodeIdToken as ReturnType<typeof mock>).mockReturnValueOnce({
      sub: 'google-sub-abc123',
      email: 'not-a-valid-email',
      picture: null,
    })

    const result = await handleGoogleCallback(createCtx(), 'auth-code', 'code-verifier')

    expect(result.success).toBe(false)
    if (result.success) return
    expect(result.error).toBe('server_error')
  })
})
