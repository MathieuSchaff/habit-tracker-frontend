import type { Database } from './db/index'

export type AppEnv = {
  Variables: {
    db: Database
    env: 'development' | 'production'
    userId: string
    userRole: 'user' | 'admin'
    jwtSecret: string
    refreshSecret: string
    frontendUrl: string
  }
}
