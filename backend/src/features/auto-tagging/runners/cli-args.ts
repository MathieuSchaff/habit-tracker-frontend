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

// Integer env flag. Distinguishes "unset" (null) from an explicit 0. The old
// `process.env.X ? Number(...) : null` idiom read X=0 as "no limit".
export function parseIntEnv(name: string): number | null {
  const raw = process.env[name]
  if (raw === undefined || raw.trim() === '') return null
  const normalized = raw.trim()
  if (!/^-?\d+$/.test(normalized)) throw new Error(`${name} must be an integer, got "${raw}"`)
  const value = Number(normalized)
  if (!Number.isSafeInteger(value)) throw new Error(`${name} must be a safe integer, got "${raw}"`)
  return value
}

// Shared runner failure path: every CLI dies with the same format.
// Success-side behaviour (plain return vs process.exit(0)) stays per-runner.
// Some scripts must force-exit to release the DB pool.
export function exitOnError(err: unknown): never {
  console.error('\n💥 Erreur :', err instanceof Error ? err.message : err)
  if (err instanceof Error && err.stack) console.error(err.stack)
  process.exit(1)
}
