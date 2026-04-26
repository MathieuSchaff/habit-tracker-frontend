import { signupSchema } from '@habit-tracker/shared'
import { describe, expect, it } from 'vitest'

const VALID_PASSWORD = 'Abcdef12!'

describe('signupSchema', () => {
  it('accepts valid email + matching strong passwords', () => {
    const r = signupSchema.safeParse({
      email: 'user@example.com',
      password: VALID_PASSWORD,
      confirmPassword: VALID_PASSWORD,
    })
    expect(r.success).toBe(true)
  })

  it('rejects mismatched passwords with confirmPassword path', () => {
    const r = signupSchema.safeParse({
      email: 'user@example.com',
      password: VALID_PASSWORD,
      confirmPassword: `${VALID_PASSWORD}X`,
    })

    expect(r.success).toBe(false)
    if (!r.success) {
      const issue = r.error.issues.find((i) => i.path[0] === 'confirmPassword')
      expect(issue?.message).toBe('Les mots de passe ne correspondent pas')
    }
  })

  it('rejects invalid email format', () => {
    const r = signupSchema.safeParse({
      email: 'not-an-email',
      password: VALID_PASSWORD,
      confirmPassword: VALID_PASSWORD,
    })
    expect(r.success).toBe(false)
  })

  it('rejects weak passwords (missing special char)', () => {
    const r = signupSchema.safeParse({
      email: 'user@example.com',
      password: 'Abcdefg1',
      confirmPassword: 'Abcdefg1',
    })
    expect(r.success).toBe(false)
  })

  it('normalises email (trim + lowercase)', () => {
    const r = signupSchema.safeParse({
      email: '  USER@Example.COM  ',
      password: VALID_PASSWORD,
      confirmPassword: VALID_PASSWORD,
    })
    expect(r.success).toBe(true)
    if (r.success) expect(r.data.email).toBe('user@example.com')
  })
})
