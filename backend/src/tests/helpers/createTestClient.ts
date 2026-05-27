import { testClient } from 'hono/testing'

import { createTestApp } from './createTestApp'

// Enter the /api segment once (like the frontend's `client.api` in lib/api.ts):
// createTestApp now mirrors prod and mounts every router under /api, so the RPC
// proxy paths (client.auth.login → /api/auth/login) resolve against the real mount.
export async function createTestClient() {
  const app = await createTestApp()
  return testClient(app).api
}

export async function createTestEnv() {
  const app = await createTestApp()
  return { app, client: testClient(app).api }
}

export type TestClient = Awaited<ReturnType<typeof createTestClient>>

export function withAuth(token: string) {
  return { headers: { Authorization: `Bearer ${token}` } } as const
}

export async function signupAndGetToken(
  client: TestClient,
  email: string,
  password: string
): Promise<{ token: string; userId: string }> {
  const res = await client.auth.signup.$post({ json: { email, password } })
  const data = await res.json()
  if (!data.success) throw new Error(`signup failed: ${JSON.stringify(data)}`)
  return { token: data.data.accessToken, userId: data.data.user.id }
}
