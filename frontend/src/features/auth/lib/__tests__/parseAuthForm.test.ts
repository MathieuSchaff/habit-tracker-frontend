import { describe, expect, it } from 'vitest'
import { z } from 'zod'

import { parseAuthForm } from '../parseAuthForm'

function buildForm(values: Record<string, string>): HTMLFormElement {
  const form = document.createElement('form')
  for (const [name, value] of Object.entries(values)) {
    const input = document.createElement('input')
    input.name = name
    input.value = value
    form.appendChild(input)
  }
  return form
}

const schema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
})

describe('parseAuthForm', () => {
  it('returns ok with parsed data on valid input', () => {
    const form = buildForm({ email: 'a@b.com', password: 'longenough' })
    const r = parseAuthForm(form, schema)

    expect(r.ok).toBe(true)
    if (r.ok) expect(r.data).toEqual({ email: 'a@b.com', password: 'longenough' })
  })

  it('returns field errors when fields fail validation', () => {
    const form = buildForm({ email: 'not-an-email', password: 'short' })
    const r = parseAuthForm(form, schema)

    expect(r.ok).toBe(false)
    if (!r.ok) {
      expect(r.fieldErrors.email?.[0]).toBeDefined()
      expect(r.fieldErrors.password?.[0]).toBeDefined()
    }
  })

  it('returns errors for missing required fields', () => {
    const form = buildForm({})
    const r = parseAuthForm(form, schema)

    expect(r.ok).toBe(false)
  })

  it('ignores form fields not declared in the schema', () => {
    const form = buildForm({ email: 'a@b.com', password: 'longenough', extra: 'ignored' })
    const r = parseAuthForm(form, schema)

    expect(r.ok).toBe(true)
    if (r.ok) expect(r.data).not.toHaveProperty('extra')
  })
})
