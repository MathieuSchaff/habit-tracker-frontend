import type { db } from './db/index'

export type Session = {
  id: string
  userId: string
  sidHash: string
  expiresAt: Date
  createdAt: Date
  revokedAt: Date | null
  lastSeenAt: Date | null
  ip: string | null
  userAgent: string | null
}
export type AppEnv = {
  Variables: {
    db: typeof db
    env: 'development' | 'production'
    userId: string
    session?: Session
    jwtSecret: string
    refreshSecret: string
  }
}
