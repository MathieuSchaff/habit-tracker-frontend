import { beforeEach, describe, expect, it } from 'bun:test'

import { HTTP_STATUS } from '@habit-tracker/shared'

import type { Hono } from 'hono'

import type { AppEnv } from '../../../app-env'
import { createTestApp } from '../../../tests/helpers/createTestApp'
import {
  authDelete,
  authGet,
  authPatch,
  authPost,
  loginAndGetToken,
} from '../../../tests/helpers/route-test-helpers'
import { TEST_CREDENTIALS } from '../../../tests/helpers/test-credentials'
import { createTestUser } from '../../../tests/helpers/test-factories'

describe('Tasks API', () => {
  let app: Hono<AppEnv>
  let token: string

  beforeEach(async () => {
    app = await createTestApp()
    const creds = TEST_CREDENTIALS.toto
    await createTestUser(creds.rawEmail, creds.rawPassword)
    token = await loginAndGetToken(app, creds.rawEmail, creds.rawPassword)
  })

  describe('GET /tasks', () => {
    it('returns empty list initially', async () => {
      const res = await authGet(app, '/tasks', token)
      expect(res.status).toBe(HTTP_STATUS.OK)
      const json = await res.json()
      expect(json.success).toBe(true)
      expect(json.data).toEqual([])
    })

    it('returns active tasks (excludes done)', async () => {
      await authPost(app, '/tasks', token, { title: 'Task A' })
      const resB = await authPost(app, '/tasks', token, { title: 'Task B' })
      const taskB = (await resB.json()).data

      await authPatch(app, `/tasks/${taskB.id}`, token, { status: 'done' })

      const res = await authGet(app, '/tasks', token)
      const json = await res.json()
      expect(json.data).toHaveLength(1)
      expect(json.data[0].title).toBe('Task A')
    })

    it('excludes snoozed tasks with future snoozedUntil', async () => {
      const createRes = await authPost(app, '/tasks', token, { title: 'Snoozée future' })
      const task = (await createRes.json()).data
      const tomorrow = new Date(Date.now() + 86400000).toISOString().split('T')[0]

      await authPatch(app, `/tasks/${task.id}`, token, {
        status: 'snoozed',
        snoozedUntil: tomorrow,
      })

      const res = await authGet(app, '/tasks', token)
      const json = await res.json()
      expect(json.data).toHaveLength(0)
    })
  })

  describe('POST /tasks', () => {
    it('creates a task with title only', async () => {
      const res = await authPost(app, '/tasks', token, { title: 'Écrire le plan' })
      expect(res.status).toBe(HTTP_STATUS.CREATED)
      const json = await res.json()
      expect(json.success).toBe(true)
      expect(json.data.title).toBe('Écrire le plan')
      expect(json.data.status).toBe('inbox')
      expect(json.data.energy).toBeNull()
    })

    it('creates a task with energy', async () => {
      const res = await authPost(app, '/tasks', token, { title: 'Méditer', energy: 'low' })
      const json = await res.json()
      expect(json.data.energy).toBe('low')
    })

    it('rejects empty title', async () => {
      const res = await authPost(app, '/tasks', token, { title: '' })
      expect(res.status).toBe(HTTP_STATUS.BAD_REQUEST)
    })
  })

  describe('PATCH /tasks/:id', () => {
    it('updates title', async () => {
      const createRes = await authPost(app, '/tasks', token, { title: 'Ancien titre' })
      const task = (await createRes.json()).data

      const res = await authPatch(app, `/tasks/${task.id}`, token, { title: 'Nouveau titre' })
      expect(res.status).toBe(HTTP_STATUS.OK)
      const json = await res.json()
      expect(json.data.title).toBe('Nouveau titre')
    })

    it('sets doneAt when status=done', async () => {
      const createRes = await authPost(app, '/tasks', token, { title: 'Fini' })
      const task = (await createRes.json()).data

      const res = await authPatch(app, `/tasks/${task.id}`, token, { status: 'done' })
      const json = await res.json()
      expect(json.data.status).toBe('done')
      expect(json.data.doneAt).not.toBeNull()
    })

    it('snoozes a task', async () => {
      const createRes = await authPost(app, '/tasks', token, { title: 'Snoozée' })
      const task = (await createRes.json()).data
      const tomorrow = new Date(Date.now() + 86400000).toISOString().split('T')[0]

      const res = await authPatch(app, `/tasks/${task.id}`, token, {
        status: 'snoozed',
        snoozedUntil: tomorrow,
      })
      const json = await res.json()
      expect(json.data.status).toBe('snoozed')
      expect(json.data.snoozedUntil).toBe(tomorrow)
    })

    it('returns 404 for another user task', async () => {
      await createTestUser('other@test.com', 'Password123!')
      const otherToken = await loginAndGetToken(app, 'other@test.com', 'Password123!')
      const createRes = await authPost(app, '/tasks', otherToken, { title: 'Autre user' })
      const task = (await createRes.json()).data

      const res = await authPatch(app, `/tasks/${task.id}`, token, { title: 'Hack' })
      expect(res.status).toBe(HTTP_STATUS.NOT_FOUND)
    })
  })

  describe('DELETE /tasks/:id', () => {
    it('deletes a task', async () => {
      const createRes = await authPost(app, '/tasks', token, { title: 'À supprimer' })
      const task = (await createRes.json()).data

      const res = await authDelete(app, `/tasks/${task.id}`, token)
      expect(res.status).toBe(HTTP_STATUS.OK)

      const listRes = await authGet(app, '/tasks', token)
      const list = (await listRes.json()).data
      expect(list).toHaveLength(0)
    })
  })

  describe('Subtasks', () => {
    it('creates and lists subtasks with correct order', async () => {
      const createRes = await authPost(app, '/tasks', token, { title: 'Projet' })
      const task = (await createRes.json()).data

      await authPost(app, `/tasks/${task.id}/subtasks`, token, { title: 'Étape 1' })
      await authPost(app, `/tasks/${task.id}/subtasks`, token, { title: 'Étape 2' })

      const res = await authGet(app, `/tasks/${task.id}/subtasks`, token)
      const json = await res.json()
      expect(json.data).toHaveLength(2)
      expect(json.data[0].order).toBe(0)
      expect(json.data[1].order).toBe(1)
    })

    it('toggles subtask completed', async () => {
      const taskRes = await authPost(app, '/tasks', token, { title: 'Projet' })
      const task = (await taskRes.json()).data
      const subRes = await authPost(app, `/tasks/${task.id}/subtasks`, token, { title: 'Étape 1' })
      const sub = (await subRes.json()).data

      const res = await authPatch(app, `/tasks/${task.id}/subtasks/${sub.id}`, token, {
        completed: true,
      })
      expect((await res.json()).data.completed).toBe(true)
    })

    it('deletes a subtask', async () => {
      const taskRes = await authPost(app, '/tasks', token, { title: 'Projet' })
      const task = (await taskRes.json()).data
      const subRes = await authPost(app, `/tasks/${task.id}/subtasks`, token, { title: 'Étape 1' })
      const sub = (await subRes.json()).data

      const res = await authDelete(app, `/tasks/${task.id}/subtasks/${sub.id}`, token)
      expect(res.status).toBe(HTTP_STATUS.OK)
    })
  })

  describe('GET /tasks/today', () => {
    it('returns only tasks completed today', async () => {
      const createRes = await authPost(app, '/tasks', token, { title: "Faite aujourd'hui" })
      const task = (await createRes.json()).data
      await authPatch(app, `/tasks/${task.id}`, token, { status: 'done' })

      const res = await authGet(app, '/tasks/today', token)
      const json = await res.json()
      expect(json.data).toHaveLength(1)
      expect(json.data[0].title).toBe("Faite aujourd'hui")
    })

    it('does not return tasks completed on other days', async () => {
      const res = await authGet(app, '/tasks/today', token)
      const json = await res.json()
      expect(json.data).toHaveLength(0)
    })
  })
})
