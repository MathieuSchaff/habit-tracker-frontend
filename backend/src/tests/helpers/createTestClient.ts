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
  // Signup no longer establishes a session (ADR 0009): create the account, then
  // log in to obtain a token. Login works pre-verification via the grace window.
  const signupRes = await client.auth.signup.$post({ json: { email, password } })
  const signupData = await signupRes.json()
  if (!signupData.success) throw new Error(`signup failed: ${JSON.stringify(signupData)}`)

  const loginRes = await client.auth.login.$post({ json: { email, password } })
  const loginData = await loginRes.json()
  if (!loginData.success) throw new Error(`login failed: ${JSON.stringify(loginData)}`)
  return { token: loginData.data.accessToken, userId: loginData.data.user.id }
}
