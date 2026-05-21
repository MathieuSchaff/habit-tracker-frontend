import { mock } from 'bun:test'

process.env.NODE_ENV = 'test'
process.env.JWT_SECRET = 'test-secret-at-least-32-chars-long-for-zod'
process.env.REFRESH_SECRET = 'test-refresh-at-least-32-chars-long-for-zod'
process.env.DATABASE_URL =
  process.env.DATABASE_URL || 'postgres://app:testpassword@localhost:5433/appdb_test'
process.env.APP_DATABASE_URL =
  process.env.APP_DATABASE_URL || 'postgres://app_runtime:testpassword@localhost:5433/appdb_test'
process.env.BREVO_API_KEY = 'brevo_test'
process.env.MAIL_FROM_EMAIL = 'noreply@test.aurore.local'
process.env.MAIL_FROM_NAME = 'Aurore (test)'
process.env.FRONTEND_URL = 'http://localhost:5173'
process.env.GOOGLE_CLIENT_ID = 'test-client-id'
process.env.GOOGLE_CLIENT_SECRET = 'test-client-secret'
process.env.GOOGLE_REDIRECT_URI = 'http://localhost:3000/auth/google/callback'
process.env.BUNNY_STORAGE_ZONE ??= 'test-zone'
process.env.BUNNY_STORAGE_PASSWORD ??= 'test-password'
process.env.IMAGE_CDN_BASE ??= 'https://test-cdn.example.com'

mock.module('../features/auth/email.service', () => ({
  sendVerificationEmail: mock(async () => {}),
}))
