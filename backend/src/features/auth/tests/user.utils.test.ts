import { randomUUID } from 'node:crypto'
import { describe, expect, it } from 'bun:test'

import type { Email, HashedPassword } from '@habit-tracker/shared'
import { emailSchema } from '@habit-tracker/shared'


import { testDb } from '../../../tests/db.test.config'
import { getProfile } from '../../profile'
import { createProfile, createUser, getUser } from '../user.utils'

describe('User Utils', () => {
  describe('getUser', () => {
    it('should find user by email', async () => {
      const email = 'find@example.com' as Email
      const passwordHash = (await Bun.password.hash('Azerty123!')) as HashedPassword

      await createUser(testDb, { email, passwordHash })

      const user = await getUser(testDb, email)
      expect(user).toBeDefined()
      expect(user?.email).toBe(email)
    })

    it('should return null if user not found', async () => {
      const user = await getUser(testDb, 'notfound@example.com')
      expect(user).toBeNull()
    })
  })

  describe('createUser', () => {
    it('should create a new user and a linked profile', async () => {
      const email = `newuser-${randomUUID()}@example.com` as Email
      const passwordHash = (await hash('Secret123!')) as HashedPassword

      const user = await createUser(testDb, { email, passwordHash })
      await createProfile(testDb, user.id)

      expect(user.id).toBeDefined()
      expect(user.email).toBe(email)

      const profile = await getProfile(testDb, user.id)
      expect(profile).toBeDefined()
      expect(profile?.userId).toBe(user.id)
    })

    it('should throw error if email is invalid', async () => {
      const email = 'invalid-email' as any
      const passwordHash = 'hash' as any

      expect(createUser(testDb, { email, passwordHash })).rejects.toThrow()
    })

    it('should throw error if email already exists', async () => {
      const email = 'duplicate@example.com' as Email
      const passwordHash = (await hash('Pass123!')) as HashedPassword

      await createUser(testDb, { email, passwordHash })

      expect(createUser(testDb, { email, passwordHash })).rejects.toThrow()
    })
  })

  describe('Validation Schemas', () => {
    it('should validate correct email', () => {
      const result = emailSchema.safeParse('test@example.com')
      expect(result.success).toBe(true)
    })

    it('should reject malformed email', () => {
      const result = emailSchema.safeParse('not-an-email')
      expect(result.success).toBe(false)
    })
  })
})
