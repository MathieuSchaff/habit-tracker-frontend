import { afterEach, describe, expect, it } from 'bun:test'

import { parseIntEnv } from './cli-args'

const ENV_NAME = 'AURORE_TEST_INTEGER_ENV'

afterEach(() => {
  delete process.env[ENV_NAME]
})

describe('parseIntEnv', () => {
  it('distinguishes an unset value from zero', () => {
    expect(parseIntEnv(ENV_NAME)).toBeNull()
    process.env[ENV_NAME] = '0'
    expect(parseIntEnv(ENV_NAME)).toBe(0)
  })

  it('accepts signed integers with surrounding whitespace', () => {
    process.env[ENV_NAME] = ' -12 '
    expect(parseIntEnv(ENV_NAME)).toBe(-12)
  })

  it('rejects partial and decimal numbers', () => {
    for (const value of ['12px', '1.5', 'NaN']) {
      process.env[ENV_NAME] = value
      expect(() => parseIntEnv(ENV_NAME)).toThrow(`${ENV_NAME} must be an integer`)
    }
  })

  it('rejects integers outside the safe range', () => {
    process.env[ENV_NAME] = '9007199254740992'
    expect(() => parseIntEnv(ENV_NAME)).toThrow(`${ENV_NAME} must be a safe integer`)
  })
})
