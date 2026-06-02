import { beforeEach, describe, expect, it } from 'bun:test'

import { HTTP_STATUS } from '@aurore/shared'

import { eq } from 'drizzle-orm'

import { roleRequests } from '../../../db/schema'
import { testDb } from '../../../tests/db.test.config'
import { setupDbTests } from '../../../tests/db-setup'
import {
  createTestClient,
  type TestClient,
  withAuth,
} from '../../../tests/helpers/createTestClient'
import { TEST_CREDENTIALS } from '../../../tests/helpers/test-credentials'
import { createTestContributorUser, createTestUser } from '../../../tests/helpers/test-factories'

async function login(client: TestClient, email: string, password: string): Promise<string> {
  const res = await client.auth.login.$post({ json: { email, password } })
  const data = await res.json()
  if (!data.success) throw new Error('login failed in role-requests test setup')
  return data.data.accessToken
}

setupDbTests()

describe('role requests — user self-service', () => {
  let client: TestClient
  let userId: string
  let userToken: string

  beforeEach(async () => {
    client = await createTestClient()
    const toto = TEST_CREDENTIALS.toto
    const user = await createTestUser(toto.rawEmail, toto.rawPassword)
    userId = user.id
    userToken = await login(client, toto.rawEmail, toto.rawPassword)
  })

  it('submits a role request (201, pending row created)', async () => {
    const res = await client['role-requests'].$post(
      { json: { motivation: 'Je veux aider à vérifier les fiches du catalogue.' } },
      withAuth(userToken)
    )

    expect(res.status as number).toBe(HTTP_STATUS.CREATED)
    const body = await res.json()
    if (!body.success) throw new Error(`expected success, got ${JSON.stringify(body)}`)
    expect(body.data).toMatchObject({ userId, status: 'pending' })

    const [row] = await testDb.select().from(roleRequests).where(eq(roleRequests.userId, userId))
    expect(row?.status).toBe('pending')
  })

  it('rejects a second pending request (409 already_pending)', async () => {
    await client['role-requests'].$post(
      { json: { motivation: 'Première demande de contribution au catalogue.' } },
      withAuth(userToken)
    )
    const res = await client['role-requests'].$post(
      { json: { motivation: 'Deuxième demande, le doublon pending est interdit.' } },
      withAuth(userToken)
    )

    expect(res.status as number).toBe(HTTP_STATUS.CONFLICT)
    const body = await res.json()
    expect(body).toMatchObject({ success: false, error: 'already_pending' })
  })

  it('rejects a request from an already-elevated role (409 already_elevated)', async () => {
    const contrib = TEST_CREDENTIALS.contributor
    await createTestContributorUser(contrib.rawEmail, contrib.rawPassword)
    const contribToken = await login(client, contrib.rawEmail, contrib.rawPassword)

    const res = await client['role-requests'].$post(
      { json: { motivation: 'Un contributeur ne devrait pas pouvoir redemander.' } },
      withAuth(contribToken)
    )

    expect(res.status as number).toBe(HTTP_STATUS.CONFLICT)
    const body = await res.json()
    expect(body).toMatchObject({ success: false, error: 'already_elevated' })
  })

  it('rejects a too-short motivation (400)', async () => {
    const res = await client['role-requests'].$post(
      { json: { motivation: 'court' } },
      withAuth(userToken)
    )

    expect(res.status as number).toBe(HTTP_STATUS.BAD_REQUEST)
  })

  it('returns the latest request on GET /me (null when none)', async () => {
    const empty = await client['role-requests'].me.$get({}, withAuth(userToken))
    const emptyBody = await empty.json()
    if (!emptyBody.success) throw new Error('expected success')
    expect(emptyBody.data).toBeNull()

    await client['role-requests'].$post(
      { json: { motivation: 'Je souhaite contribuer à la curation des fiches.' } },
      withAuth(userToken)
    )
    const res = await client['role-requests'].me.$get({}, withAuth(userToken))
    const body = await res.json()
    if (!body.success) throw new Error('expected success')
    expect(body.data).toMatchObject({ userId, status: 'pending' })
  })

  it('cancels its own pending request and allows re-submission', async () => {
    const submit = await client['role-requests'].$post(
      { json: { motivation: 'Demande à annuler puis re-soumettre.' } },
      withAuth(userToken)
    )
    const submitBody = await submit.json()
    if (!submitBody.success) throw new Error('expected success')
    const requestId = submitBody.data.id

    const res = await client['role-requests'][':id'].cancel.$post(
      { param: { id: requestId } },
      withAuth(userToken)
    )

    expect(res.status as number).toBe(HTTP_STATUS.OK)
    const body = await res.json()
    if (!body.success) throw new Error('expected success')
    expect(body.data.status).toBe('cancelled')

    // cancelled !== pending, so the partial unique index lets a fresh request through.
    const resubmit = await client['role-requests'].$post(
      { json: { motivation: 'Nouvelle demande après annulation.' } },
      withAuth(userToken)
    )
    expect(resubmit.status as number).toBe(HTTP_STATUS.CREATED)
  })

  it('rejects cancelling a non-pending request (409 not_pending)', async () => {
    const submit = await client['role-requests'].$post(
      { json: { motivation: 'Demande annulée une première fois.' } },
      withAuth(userToken)
    )
    const submitBody = await submit.json()
    if (!submitBody.success) throw new Error('expected success')
    const requestId = submitBody.data.id

    await client['role-requests'][':id'].cancel.$post(
      { param: { id: requestId } },
      withAuth(userToken)
    )
    const res = await client['role-requests'][':id'].cancel.$post(
      { param: { id: requestId } },
      withAuth(userToken)
    )

    expect(res.status as number).toBe(HTTP_STATUS.CONFLICT)
    const body = await res.json()
    expect(body).toMatchObject({ success: false, error: 'not_pending' })
  })

  it('cannot cancel an unknown request (404 not_found)', async () => {
    const res = await client['role-requests'][':id'].cancel.$post(
      { param: { id: crypto.randomUUID() } },
      withAuth(userToken)
    )

    expect(res.status as number).toBe(HTTP_STATUS.NOT_FOUND)
  })

  it('cannot cancel another user request (404, row untouched)', async () => {
    const other = await createTestUser('autre@exemple.fr', 'Autre123!ok')
    const [otherReq] = await testDb
      .insert(roleRequests)
      .values({ userId: other.id, motivation: 'Demande appartenant à un autre utilisateur.' })
      .returning()
    if (!otherReq) throw new Error('seed failed')

    const res = await client['role-requests'][':id'].cancel.$post(
      { param: { id: otherReq.id } },
      withAuth(userToken)
    )
    expect(res.status as number).toBe(HTTP_STATUS.NOT_FOUND)

    // the userId filter discriminates even under BYPASSRLS: the other user's row is untouched
    const [row] = await testDb
      .select({ status: roleRequests.status })
      .from(roleRequests)
      .where(eq(roleRequests.id, otherReq.id))
    expect(row?.status).toBe('pending')
  })

  it('allows re-submission after a previous request was rejected', async () => {
    await testDb
      .insert(roleRequests)
      .values({ userId, motivation: 'Demande déjà refusée par un admin.', status: 'rejected' })

    // rejected !== pending, so neither the pre-check nor the partial unique index blocks a new one
    const res = await client['role-requests'].$post(
      { json: { motivation: 'Nouvelle demande après un refus.' } },
      withAuth(userToken)
    )
    expect(res.status as number).toBe(HTTP_STATUS.CREATED)
  })

  it('requires authentication (401)', async () => {
    const res = await client['role-requests'].$post({
      json: { motivation: 'Sans authentification, doit échouer.' },
    })

    expect(res.status as number).toBe(HTTP_STATUS.UNAUTHORIZED)
  })
})
