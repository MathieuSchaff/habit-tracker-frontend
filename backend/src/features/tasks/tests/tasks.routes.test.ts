import { beforeEach, describe, expect, it } from 'bun:test'

import { HTTP_STATUS } from '@habit-tracker/shared'

import type { Hono } from 'hono'

import type { AppEnv } from '../../../app-env'
import { setupDbTests } from '../../../tests/db-setup'
import { createTestEnv, type TestClient, withAuth } from '../../../tests/helpers/createTestClient'
import { authPatch, authPost, loginAndGetToken } from '../../../tests/helpers/route-test-helpers'
import { TEST_CREDENTIALS } from '../../../tests/helpers/test-credentials'
import { createTestUser } from '../../../tests/helpers/test-factories'

setupDbTests()

describe('Tasks API', () => {
  let app: Hono<AppEnv>
  let client: TestClient
  let token: string

  beforeEach(async () => {
    const env = await createTestEnv()
    app = env.app
    client = env.client
    const creds = TEST_CREDENTIALS.toto
    await createTestUser(creds.rawEmail, creds.rawPassword)
    token = await loginAndGetToken(app, creds.rawEmail, creds.rawPassword)
  })

  describe('GET /tasks', () => {
    it('returns empty list initially', async () => {
      const res = await client.tasks.$get({}, withAuth(token))
      expect(res.status).toBe(HTTP_STATUS.OK)
      const json = await res.json()
      expect(json.success).toBe(true)
      if (!json.success) throw new Error('expected ok')
      expect(json.data).toEqual([])
    })

    it('returns active tasks (excludes done)', async () => {
      await client.tasks.$post({ json: { title: 'Task A' } }, withAuth(token))
      const resB = await client.tasks.$post({ json: { title: 'Task B' } }, withAuth(token))
      const dataB = await resB.json()
      if (!dataB.success) throw new Error('expected ok')
      const taskB = dataB.data

      await client.tasks[':id'].$patch(
        { json: { status: 'done' }, param: { id: taskB.id } },
        withAuth(token)
      )

      const res = await client.tasks.$get({}, withAuth(token))
      const json = await res.json()
      if (!json.success) throw new Error('expected ok')
      expect(json.data).toHaveLength(1)
      expect(json.data[0]?.title).toBe('Task A')
    })

    it('excludes snoozed tasks with future snoozedUntil', async () => {
      const createRes = await client.tasks.$post(
        { json: { title: 'Snoozée future' } },
        withAuth(token)
      )
      const createData = await createRes.json()
      if (!createData.success) throw new Error('expected ok')
      const task = createData.data
      const tomorrow = new Date(Date.now() + 86400000).toISOString()

      await client.tasks[':id'].$patch(
        {
          json: { status: 'snoozed', snoozedUntil: tomorrow },
          param: { id: task.id },
        },
        withAuth(token)
      )

      const res = await client.tasks.$get({}, withAuth(token))
      const json = await res.json()
      if (!json.success) throw new Error('expected ok')
      expect(json.data).toHaveLength(0)
    })
  })

  describe('POST /tasks', () => {
    it('creates a task with title only', async () => {
      const res = await client.tasks.$post({ json: { title: 'Écrire le plan' } }, withAuth(token))
      expect(res.status).toBe(HTTP_STATUS.CREATED)
      const json = await res.json()
      expect(json.success).toBe(true)
      if (!json.success) throw new Error('expected ok')
      expect(json.data.title).toBe('Écrire le plan')
      expect(json.data.status).toBe('inbox')
      expect(json.data.energy).toBeNull()
    })

    it('creates a task with energy', async () => {
      const res = await client.tasks.$post(
        { json: { title: 'Méditer', energy: 'low' } },
        withAuth(token)
      )
      const json = await res.json()
      if (!json.success) throw new Error('expected ok')
      expect(json.data.energy).toBe('low')
    })

    it('rejects empty title', async () => {
      // zValidator failures return 400; not in the typed response. Use raw helper.
      const res = await authPost(app, '/tasks', token, { title: '' })
      expect(res.status).toBe(HTTP_STATUS.BAD_REQUEST)
    })
  })

  describe('PATCH /tasks/:id', () => {
    it('updates title', async () => {
      const createRes = await client.tasks.$post(
        { json: { title: 'Ancien titre' } },
        withAuth(token)
      )
      const createData = await createRes.json()
      if (!createData.success) throw new Error('expected ok')
      const task = createData.data

      const res = await client.tasks[':id'].$patch(
        { json: { title: 'Nouveau titre' }, param: { id: task.id } },
        withAuth(token)
      )
      expect(res.status).toBe(HTTP_STATUS.OK)
      const json = await res.json()
      if (!json.success) throw new Error('expected ok')
      expect(json.data.title).toBe('Nouveau titre')
    })

    it('sets doneAt when status=done', async () => {
      const createRes = await client.tasks.$post({ json: { title: 'Fini' } }, withAuth(token))
      const createData = await createRes.json()
      if (!createData.success) throw new Error('expected ok')
      const task = createData.data

      const res = await client.tasks[':id'].$patch(
        { json: { status: 'done' }, param: { id: task.id } },
        withAuth(token)
      )
      const json = await res.json()
      if (!json.success) throw new Error('expected ok')
      expect(json.data.status).toBe('done')
      expect(json.data.doneAt).not.toBeNull()
    })

    it('snoozes a task', async () => {
      const createRes = await client.tasks.$post({ json: { title: 'Snoozée' } }, withAuth(token))
      const createData = await createRes.json()
      if (!createData.success) throw new Error('expected ok')
      const task = createData.data
      // Calendar columns truncate to UTC midnight on the wire.
      const tomorrowDate = new Date(Date.now() + 86400000).toISOString().slice(0, 10)
      const tomorrow = `${tomorrowDate}T00:00:00.000Z`

      const res = await client.tasks[':id'].$patch(
        {
          json: { status: 'snoozed', snoozedUntil: tomorrow },
          param: { id: task.id },
        },
        withAuth(token)
      )
      const json = await res.json()
      if (!json.success) throw new Error('expected ok')
      expect(json.data.status).toBe('snoozed')
      expect(json.data.snoozedUntil).toBe(tomorrow)
    })

    it('returns 404 for another user task', async () => {
      await createTestUser('other@test.com', 'Password123!')
      const otherToken = await loginAndGetToken(app, 'other@test.com', 'Password123!')
      const createRes = await client.tasks.$post(
        { json: { title: 'Autre user' } },
        withAuth(otherToken)
      )
      const createData = await createRes.json()
      if (!createData.success) throw new Error('expected ok')
      const task = createData.data

      // Cross-user TaskError → 404 from globalErrorHandler, not in typed response.
      const res = await authPatch(app, `/tasks/${task.id}`, token, { title: 'Hack' })
      expect(res.status).toBe(HTTP_STATUS.NOT_FOUND)
    })
  })

  describe('DELETE /tasks/:id', () => {
    it('deletes a task', async () => {
      const createRes = await client.tasks.$post(
        { json: { title: 'À supprimer' } },
        withAuth(token)
      )
      const createData = await createRes.json()
      if (!createData.success) throw new Error('expected ok')
      const task = createData.data

      const res = await client.tasks[':id'].$delete({ param: { id: task.id } }, withAuth(token))
      expect(res.status).toBe(HTTP_STATUS.OK)

      const listRes = await client.tasks.$get({}, withAuth(token))
      const listData = await listRes.json()
      if (!listData.success) throw new Error('expected ok')
      expect(listData.data).toHaveLength(0)
    })
  })

  describe('Subtasks', () => {
    it('creates and lists subtasks with correct order', async () => {
      const createRes = await client.tasks.$post({ json: { title: 'Projet' } }, withAuth(token))
      const createData = await createRes.json()
      if (!createData.success) throw new Error('expected ok')
      const task = createData.data

      await client.tasks[':id'].subtasks.$post(
        { json: { title: 'Étape 1' }, param: { id: task.id } },
        withAuth(token)
      )
      await client.tasks[':id'].subtasks.$post(
        { json: { title: 'Étape 2' }, param: { id: task.id } },
        withAuth(token)
      )

      const res = await client.tasks[':id'].subtasks.$get(
        { param: { id: task.id } },
        withAuth(token)
      )
      const json = await res.json()
      if (!json.success) throw new Error('expected ok')
      expect(json.data).toHaveLength(2)
      expect(json.data[0]?.order).toBe(0)
      expect(json.data[1]?.order).toBe(1)
    })

    it('toggles subtask completed', async () => {
      const taskRes = await client.tasks.$post({ json: { title: 'Projet' } }, withAuth(token))
      const taskData = await taskRes.json()
      if (!taskData.success) throw new Error('expected ok')
      const task = taskData.data
      const subRes = await client.tasks[':id'].subtasks.$post(
        { json: { title: 'Étape 1' }, param: { id: task.id } },
        withAuth(token)
      )
      const subData = await subRes.json()
      if (!subData.success) throw new Error('expected ok')
      const sub = subData.data

      const res = await client.tasks[':id'].subtasks[':subId'].$patch(
        {
          json: { completed: true },
          param: { id: task.id, subId: sub.id },
        },
        withAuth(token)
      )
      const json = await res.json()
      if (!json.success) throw new Error('expected ok')
      expect(json.data.completed).toBe(true)
    })

    it('deletes a subtask', async () => {
      const taskRes = await client.tasks.$post({ json: { title: 'Projet' } }, withAuth(token))
      const taskData = await taskRes.json()
      if (!taskData.success) throw new Error('expected ok')
      const task = taskData.data
      const subRes = await client.tasks[':id'].subtasks.$post(
        { json: { title: 'Étape 1' }, param: { id: task.id } },
        withAuth(token)
      )
      const subData = await subRes.json()
      if (!subData.success) throw new Error('expected ok')
      const sub = subData.data

      const res = await client.tasks[':id'].subtasks[':subId'].$delete(
        { param: { id: task.id, subId: sub.id } },
        withAuth(token)
      )
      expect(res.status).toBe(HTTP_STATUS.OK)
    })
  })

  describe('GET /tasks/today', () => {
    it('returns only tasks completed today', async () => {
      const createRes = await client.tasks.$post(
        { json: { title: "Faite aujourd'hui" } },
        withAuth(token)
      )
      const createData = await createRes.json()
      if (!createData.success) throw new Error('expected ok')
      const task = createData.data
      await client.tasks[':id'].$patch(
        { json: { status: 'done' }, param: { id: task.id } },
        withAuth(token)
      )

      const res = await client.tasks.today.$get({}, withAuth(token))
      const json = await res.json()
      if (!json.success) throw new Error('expected ok')
      expect(json.data).toHaveLength(1)
      expect(json.data[0]?.title).toBe("Faite aujourd'hui")
    })

    it('does not return tasks completed on other days', async () => {
      const res = await client.tasks.today.$get({}, withAuth(token))
      const json = await res.json()
      if (!json.success) throw new Error('expected ok')
      expect(json.data).toHaveLength(0)
    })
  })
})
