import type { db } from './db/index'

export type AppEnv = {
  Variables: {
    db: typeof db
    env: 'development' | 'production'
    userId: string
    jwtSecret: string
    refreshSecret: string
  }
}
