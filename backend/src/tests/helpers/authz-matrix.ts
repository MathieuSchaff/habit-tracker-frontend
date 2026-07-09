import { it } from 'bun:test'

import { HTTP_STATUS } from '@aurore/shared'

import type { Hono } from 'hono'

import type { AppEnv } from '../../app-env'
import { expectStatus } from './expectStatus'
import { setupAndLogin, setupAndLoginAdmin, setupAndLoginContributor } from './route-test-helpers'
import { TEST_CREDENTIALS } from './test-credentials'

type Method = 'GET' | 'POST' | 'PATCH' | 'PUT' | 'DELETE'

export interface AuthzRequest {
  method: Method
  path: string
  body?: object
}

function fire(app: Hono<AppEnv>, req: AuthzRequest, token?: string) {
  const headers: Record<string, string> = {}
  if (req.body !== undefined) headers['Content-Type'] = 'application/json'
  if (token) headers.Authorization = `Bearer ${token}`
  return app.request(req.path, {
    method: req.method,
    headers,
    body: req.body === undefined ? undefined : JSON.stringify(req.body),
  })
}

// getApp is a thunk: route suites rebuild the app in beforeEach, so the helper
// must read it at run time, not at describe-eval time.

// Covers both missing-token and invalid-token cases in one assertion,
// since some call sites used to check only the missing-token path.
export function expectRequiresAuth(getApp: () => Hono<AppEnv>, req: AuthzRequest) {
  it('requires authentication', async () => {
    expectStatus(await fire(getApp(), req), HTTP_STATUS.UNAUTHORIZED)
    expectStatus(await fire(getApp(), req, 'invalid.token.here'), HTTP_STATUS.UNAUTHORIZED)
  })
}

type Role = 'user' | 'contributor' | 'admin'

const LOGIN: Record<Role, (app: Hono<AppEnv>) => Promise<string>> = {
  user: (app) => setupAndLogin(app, TEST_CREDENTIALS.toto),
  contributor: (app) => setupAndLoginContributor(app, TEST_CREDENTIALS.contributor),
  admin: (app) => setupAndLoginAdmin(app, TEST_CREDENTIALS.admin),
}

// A static request, or a per-test builder that provisions prerequisite rows
// (e.g. create the product a PUT targets) and returns the request pointing at
// them. The builder runs inside each role's test, after the beforeEach DB reset.
type AuthzRequestInput = AuthzRequest | (() => AuthzRequest | Promise<AuthzRequest>)

// Test users come from idempotent factories, so this composes with whatever
// the suite's beforeEach already set up.
export function expectRoleMatrix(
  getApp: () => Hono<AppEnv>,
  req: AuthzRequestInput,
  expected: Partial<Record<Role, number>>
) {
  for (const role of Object.keys(expected) as Role[]) {
    const status = expected[role]
    if (status === undefined) continue
    it(`${status} for a ${role}`, async () => {
      const app = getApp()
      const resolved = typeof req === 'function' ? await req() : req
      const token = await LOGIN[role](app)
      expectStatus(await fire(app, resolved, token), status)
    })
  }
}
