import type { Hono } from 'hono'

import type { AppEnv } from '../../app-env'
import { createTestAdminUser, createTestContributorUser, createTestUser } from './test-factories'

// authBase defaults to '/api/auth' because the shared test harness (createTestApp)
// mirrors prod and mounts auth under /api. Pass '/auth' for a bare-mounted own app.
export async function loginAndGetToken(
  app: Hono<AppEnv>,
  email: string,
  password: string,
  authBase = '/api/auth'
) {
  const res = await app.request(`${authBase}/mobile/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password }),
  })
  const data = (await res.json()) as { success: boolean; data: { accessToken: string } }
  if (!data.success) throw new Error('Login failed in helper')
  return data.data.accessToken
}

export async function setupAndLogin(
  app: Hono<AppEnv>,
  creds: { rawEmail: string; rawPassword: string },
  authBase = '/api/auth'
) {
  await createTestUser(creds.rawEmail, creds.rawPassword)
  return loginAndGetToken(app, creds.rawEmail, creds.rawPassword, authBase)
}

export async function setupAndLoginAdmin(
  app: Hono<AppEnv>,
  creds: { rawEmail: string; rawPassword: string },
  authBase = '/api/auth'
) {
  await createTestAdminUser(creds.rawEmail, creds.rawPassword)
  return loginAndGetToken(app, creds.rawEmail, creds.rawPassword, authBase)
}

export async function setupAndLoginContributor(
  app: Hono<AppEnv>,
  creds: { rawEmail: string; rawPassword: string },
  authBase = '/api/auth'
) {
  await createTestContributorUser(creds.rawEmail, creds.rawPassword)
  return loginAndGetToken(app, creds.rawEmail, creds.rawPassword, authBase)
}

export function authGet(app: Hono<AppEnv>, path: string, token: string) {
  return app.request(path, {
    headers: { Authorization: `Bearer ${token}` },
  })
}

export function authPost(app: Hono<AppEnv>, path: string, token: string, body: object) {
  return app.request(path, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
    body: JSON.stringify(body),
  })
}

export function authPatch(app: Hono<AppEnv>, path: string, token: string, body: object) {
  return app.request(path, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
    body: JSON.stringify(body),
  })
}

export function authPut(app: Hono<AppEnv>, path: string, token: string, body: object) {
  return app.request(path, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
    body: JSON.stringify(body),
  })
}

export function authDelete(app: Hono<AppEnv>, path: string, token: string) {
  return app.request(path, {
    method: 'DELETE',
    headers: { Authorization: `Bearer ${token}` },
  })
}

export function authPostMultipart(
  app: Hono<AppEnv>,
  path: string,
  token: string,
  fields: Record<string, Blob | string>
) {
  const form = new FormData()
  for (const [k, v] of Object.entries(fields)) form.append(k, v)
  return app.request(path, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}` },
    body: form,
  })
}
