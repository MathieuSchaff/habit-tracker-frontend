import { describe, expect, it } from 'bun:test'

import { and, eq, isNull } from 'drizzle-orm'

import { emailVerifications } from '../../../db/schema'
import { TEST_CREDENTIALS } from '../../../tests/helpers/test-credentials'
import { createTestUser } from '../../../tests/helpers/test-factories'
import {
  createVerificationToken,
  hasVerifiedEmail,
  verifyEmailToken,
} from '../email-verification.service'
import { testDb } from './auth-test.setup'

describe('email-verification.service', () => {
  describe('createVerificationToken', () => {
    it('devrait générer un token raw non vide', async () => {
      const user = await createTestUser(
        TEST_CREDENTIALS.toto.rawEmail,
        TEST_CREDENTIALS.toto.rawPassword
      )
      const token = await createVerificationToken(testDb, user.id)
      expect(token).toBeString()
      expect(token.length).toBe(64)
    })

    it('devrait stocker le hash du token en base, pas le token raw', async () => {
      const user = await createTestUser(
        TEST_CREDENTIALS.toto.rawEmail,
        TEST_CREDENTIALS.toto.rawPassword
      )
      const token = await createVerificationToken(testDb, user.id)

      const [row] = await testDb
        .select()
        .from(emailVerifications)
        .where(and(eq(emailVerifications.userId, user.id), isNull(emailVerifications.usedAt)))

      expect(row).toBeDefined()
      expect(row?.tokenHash).not.toBe(token)
      expect(row?.usedAt).toBeNull()
    })

    it('devrait invalider les anciens tokens non utilisés du même user', async () => {
      const user = await createTestUser(
        TEST_CREDENTIALS.toto.rawEmail,
        TEST_CREDENTIALS.toto.rawPassword
      )

      await createVerificationToken(testDb, user.id)
      await createVerificationToken(testDb, user.id)

      const activeTokens = await testDb
        .select()
        .from(emailVerifications)
        .where(eq(emailVerifications.userId, user.id))
        .then((rows) => rows.filter((r) => r.usedAt === null))

      expect(activeTokens.length).toBe(1)
    })

    it('devrait définir expiresAt à 1h dans le futur', async () => {
      const user = await createTestUser(
        TEST_CREDENTIALS.toto.rawEmail,
        TEST_CREDENTIALS.toto.rawPassword
      )
      const before = new Date()
      await createVerificationToken(testDb, user.id)
      const after = new Date()

      const [row] = await testDb
        .select()
        .from(emailVerifications)
        .where(and(eq(emailVerifications.userId, user.id), isNull(emailVerifications.usedAt)))

      const expiry = row?.expiresAt.getTime()
      expect(expiry).toBeGreaterThan(before.getTime() + 59 * 60 * 1000)
      expect(expiry).toBeLessThanOrEqual(after.getTime() + 60 * 60 * 1000 + 1000)
    })
  })

  describe('verifyEmailToken', () => {
    it('devrait vérifier un token valide et mettre à jour emailVerifiedAt', async () => {
      const user = await createTestUser(
        TEST_CREDENTIALS.toto.rawEmail,
        TEST_CREDENTIALS.toto.rawPassword
      )
      const token = await createVerificationToken(testDb, user.id)

      const result = await verifyEmailToken(testDb, token)

      expect(result.success).toBe(true)
      if (!result.success) return
      expect(result.data).toBe(user.id)
    })

    it('devrait marquer le token comme utilisé après vérification', async () => {
      const user = await createTestUser(
        TEST_CREDENTIALS.toto.rawEmail,
        TEST_CREDENTIALS.toto.rawPassword
      )
      const token = await createVerificationToken(testDb, user.id)
      await verifyEmailToken(testDb, token)

      const [row] = await testDb
        .select()
        .from(emailVerifications)
        .where(eq(emailVerifications.userId, user.id))

      expect(row?.usedAt).not.toBeNull()
    })

    it('devrait retourner invalid_token pour un token inconnu', async () => {
      const result = await verifyEmailToken(testDb, 'a'.repeat(64))
      expect(result.success).toBe(false)
      if (result.success) return
      expect(result.error).toBe('invalid_token')
    })

    it('devrait retourner invalid_token pour un token déjà utilisé', async () => {
      const user = await createTestUser(
        TEST_CREDENTIALS.toto.rawEmail,
        TEST_CREDENTIALS.toto.rawPassword
      )
      const token = await createVerificationToken(testDb, user.id)
      await verifyEmailToken(testDb, token)

      const result = await verifyEmailToken(testDb, token)
      expect(result.success).toBe(false)
      if (result.success) return
      expect(result.error).toBe('invalid_token')
    })

    it('devrait retourner token_expired pour un token expiré', async () => {
      const user = await createTestUser(
        TEST_CREDENTIALS.toto.rawEmail,
        TEST_CREDENTIALS.toto.rawPassword
      )
      const token = await createVerificationToken(testDb, user.id)

      await testDb
        .update(emailVerifications)
        .set({ expiresAt: new Date(Date.now() - 1000) })
        .where(eq(emailVerifications.userId, user.id))

      const result = await verifyEmailToken(testDb, token)
      expect(result.success).toBe(false)
      if (result.success) return
      expect(result.error).toBe('token_expired')
    })

    it('devrait retourner ok et marquer usedAt si le user est déjà vérifié (idempotent)', async () => {
      const { users: usersTable } = await import('../../../db/schema')
      const user = await createTestUser(
        TEST_CREDENTIALS.toto.rawEmail,
        TEST_CREDENTIALS.toto.rawPassword
      )
      const token = await createVerificationToken(testDb, user.id)

      await testDb
        .update(usersTable)
        .set({ emailVerifiedAt: new Date() })
        .where(eq(usersTable.id, user.id))

      const result = await verifyEmailToken(testDb, token)
      expect(result.success).toBe(true)

      const [row] = await testDb
        .select()
        .from(emailVerifications)
        .where(eq(emailVerifications.userId, user.id))
      expect(row?.usedAt).not.toBeNull()
    })
  })

  describe('hasVerifiedEmail', () => {
    it('devrait retourner false si emailVerifiedAt est null', async () => {
      const user = await createTestUser(
        TEST_CREDENTIALS.toto.rawEmail,
        TEST_CREDENTIALS.toto.rawPassword
      )
      const result = await hasVerifiedEmail(testDb, user.id)
      expect(result).toBe(false)
    })

    it('devrait retourner true si emailVerifiedAt est défini', async () => {
      const { users: usersTable } = await import('../../../db/schema')
      const user = await createTestUser(
        TEST_CREDENTIALS.toto.rawEmail,
        TEST_CREDENTIALS.toto.rawPassword
      )
      await testDb
        .update(usersTable)
        .set({ emailVerifiedAt: new Date() })
        .where(eq(usersTable.id, user.id))
      const result = await hasVerifiedEmail(testDb, user.id)
      expect(result).toBe(true)
    })
  })
})
