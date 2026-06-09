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
