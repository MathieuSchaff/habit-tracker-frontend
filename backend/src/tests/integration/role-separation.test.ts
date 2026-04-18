import { describe, expect, it } from 'bun:test'
import { SQL } from 'bun'

describe('runtime role (app_runtime)', () => {
  // Bun 1.3.12: .rejects.toThrow() hangs with SQL tagged templates — use try/catch instead.
  it('cannot CREATE TABLE', async () => {
    const pool = new SQL(process.env.APP_DATABASE_URL!)
    let threw = false
    try {
      await pool`CREATE TABLE forbidden_table (id int)`
    } catch (e: unknown) {
      threw = true
      expect((e as Error).message).toMatch(/permission denied/i)
    } finally {
      await pool.close()
    }
    expect(threw).toBe(true)
  })

  it('can SELECT from an existing table', async () => {
    const pool = new SQL(process.env.APP_DATABASE_URL!)
    // Table may be empty — we care that the query succeeds without a permission error.
    const rows = (await pool`SELECT 1 AS ok FROM users LIMIT 1`) as unknown as Array<{ ok: number }>
    await pool.close()
    expect(Array.isArray(rows)).toBe(true)
  })
})
