export function parseWriteSlugArgs(argv: string[] = process.argv): {
  write: boolean
  slug: string | null
} {
  const i = argv.indexOf('--slug')
  return {
    write: argv.includes('--write'),
    slug: i !== -1 ? (argv[i + 1] ?? null) : null,
  }
}

// Integer env flag. Distinguishes "unset" (null) from an explicit 0 — the old
// `process.env.X ? Number(...) : null` idiom read X=0 as "no limit".
export function parseIntEnv(name: string): number | null {
  const raw = process.env[name]
  if (raw === undefined || raw.trim() === '') return null
  const value = Number.parseInt(raw, 10)
  if (Number.isNaN(value)) throw new Error(`${name} must be an integer, got "${raw}"`)
  return value
}

// Shared runner failure path: every CLI dies with the same 💥 format.
// Success-side behaviour (plain return vs process.exit(0)) stays per-runner —
// some scripts must force-exit to release the DB pool.
export function exitOnError(err: unknown): never {
  console.error('\n💥 Erreur :', err instanceof Error ? err.message : err)
  if (err instanceof Error && err.stack) console.error(err.stack)
  process.exit(1)
}
