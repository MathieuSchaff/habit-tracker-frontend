import { testDb } from '../../../tests/db.test.config'
import { JWT_SECRET, REFRESH_SECRET } from '../../../tests/helpers/secrets'
import type { AuthContext } from '../service'
export function createCtx(overrides?: Partial<AuthContext>): AuthContext {
  return {
    db: testDb,
    jwtSecret: JWT_SECRET,
    refreshSecret: REFRESH_SECRET,
    frontendUrl: 'http://localhost:5173',
    ...overrides,
  }
}

export { testDb }
