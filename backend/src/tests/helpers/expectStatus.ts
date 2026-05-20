// Hono's testClient narrows `res.status` to the literal union of statuses the
// route returns via `c.json(..., STATUS)`. Routes that throw errors and rely
// on the global error handler expose only the success status in their type,
// so `expect(res.status).toBe(HTTP_STATUS.NOT_FOUND)` clashes. This helper
// erases the narrowing for assertions where we know the runtime status
// differs from the type-level union.

import { expect } from 'bun:test'

export function expectStatus(res: { status: number }, code: number): void {
  expect(res.status as number).toBe(code)
}
