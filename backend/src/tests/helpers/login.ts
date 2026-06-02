import type { TestClient } from './createTestClient'

// Shared across catalog/submission integration suites — logs in via the RPC client
// and returns the access token.
export async function login(client: TestClient, email: string, password: string): Promise<string> {
  const res = await client.auth.login.$post({ json: { email, password } })
  const data = await res.json()
  if (!data.success) throw new Error(`login failed for ${email}`)
  return data.data.accessToken
}
