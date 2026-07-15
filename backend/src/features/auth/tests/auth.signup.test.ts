import { describe, expect, it } from 'bun:test'

import { eq } from 'drizzle-orm'

import { emailVerifications, users } from '../../../db/schema'
import { setupDbTests } from '../../../tests/db-setup'
import { TEST_CREDENTIALS } from '../../../tests/helpers/test-credentials'
import { createTestUser } from '../../../tests/helpers/test-factories'
import { signup } from '../service'
import { createCtx, testDb } from './auth-test.setup'

setupDbTests()

// Signup is enumeration-safe (ADR 0009): the response is an identical neutral
// `{ pending: true }` with no session whether the email is new or already taken;
// the new-vs-existing truth reaches only the address owner, by email. These tests
// are the guard: a code, status, session, or shape difference would re-open the leak.
describe('signup', () => {
  async function userRow(email: string) {
    const [row] = await testDb.select().from(users).where(eq(users.email, email))
    return row
  }

  async function userCount(email: string) {
    return (await testDb.select().from(users).where(eq(users.email, email))).length
  }

  it('renvoie une réponse neutre pending pour un email nouveau, sans session', async () => {
    const creds = TEST_CREDENTIALS.toto

    const result = await signup(createCtx(), creds.email, creds.password)

    expect(result.success).toBe(true)
    if (!result.success) return
    expect(result.data).toEqual({ pending: true })
    const data = result.data as Record<string, unknown>
    expect(data.accessToken).toBeUndefined()
    expect(data.refreshToken).toBeUndefined()
    expect(data.user).toBeUndefined()
  })

  it('crée le compte non vérifié sur la branche email nouveau', async () => {
    const creds = TEST_CREDENTIALS.toto

    await signup(createCtx(), creds.email, creds.password)

    const row = await userRow(creds.rawEmail)
    expect(row).toBeDefined()
    expect(row?.emailVerifiedAt).toBeNull()
  })

  it("renvoie la MÊME réponse neutre pour un email existant (guard d'énumération)", async () => {
    const fresh = await signup(
      createCtx(),
      TEST_CREDENTIALS.alice.email,
      TEST_CREDENTIALS.alice.password
    )

    const creds = TEST_CREDENTIALS.toto
    await createTestUser(creds.rawEmail, creds.rawPassword)
    const existing = await signup(createCtx(), creds.email, creds.password)

    // Byte-identical: no difference in code, status or shape between new and existing.
    expect(existing).toEqual(fresh)
    expect(existing.success).toBe(true)
  })

  it("ne crée pas de second compte quand l'email existe déjà", async () => {
    const creds = TEST_CREDENTIALS.toto
    await createTestUser(creds.rawEmail, creds.rawPassword)

    expect(await userCount(creds.rawEmail)).toBe(1)
    await signup(createCtx(), creds.email, creds.password)
    expect(await userCount(creds.rawEmail)).toBe(1)
  })

  it("normalise l'email (majuscules) en créant le compte", async () => {
    await signup(
      createCtx(),
      TEST_CREDENTIALS.totoVariants.majuscules,
      TEST_CREDENTIALS.toto.password
    )
    expect(await userRow(TEST_CREDENTIALS.toto.rawEmail)).toBeDefined()
  })

  it("normalise l'email (espaces autour) en créant le compte", async () => {
    await signup(
      createCtx(),
      TEST_CREDENTIALS.totoVariants.avecEspaces,
      TEST_CREDENTIALS.toto.password
    )
    expect(await userRow(TEST_CREDENTIALS.toto.rawEmail)).toBeDefined()
  })

  it('détecte un email existant quelle que soit la casse (pas de second compte)', async () => {
    const creds = TEST_CREDENTIALS.toto
    await createTestUser(creds.rawEmail, creds.rawPassword)

    const result = await signup(
      createCtx(),
      TEST_CREDENTIALS.totoVariants.majuscules,
      creds.password
    )

    expect(result.success).toBe(true)
    expect(await userCount(creds.rawEmail)).toBe(1)
  })

  it('crée un token de vérification sur la branche email nouveau', async () => {
    const creds = TEST_CREDENTIALS.toto

    await signup(createCtx(), creds.email, creds.password)
    const row = await userRow(creds.rawEmail)
    if (!row) throw new Error('user not created')

    const [token] = await testDb
      .select()
      .from(emailVerifications)
      .where(eq(emailVerifications.userId, row.id))

    expect(token).toBeDefined()
    expect(token?.usedAt).toBeNull()
  })

  it('inscrit plusieurs utilisateurs distincts indépendamment', async () => {
    const { toto, alice, jeanmichel: jm } = TEST_CREDENTIALS

    const r1 = await signup(createCtx(), toto.email, toto.password)
    const r2 = await signup(createCtx(), alice.email, alice.password)
    const r3 = await signup(createCtx(), jm.email, jm.password)

    expect(r1.success && r2.success && r3.success).toBe(true)
    expect(await userRow(toto.rawEmail)).toBeDefined()
    expect(await userRow(alice.rawEmail)).toBeDefined()
    expect(await userRow(jm.rawEmail)).toBeDefined()
  })
})
