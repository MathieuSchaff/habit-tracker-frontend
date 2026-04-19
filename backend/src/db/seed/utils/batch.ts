export interface ProductTagGroups {
  primary: string[]
  secondary: string[]
  avoid: string[]
}

export interface SeedError {
  item: string
  reason: string
}

export function toNull(value: string | null | undefined): string | null {
  if (value === null || value === undefined || value === '') return null
  return value
}

export function toNumeric(val: unknown): string | null {
  if (val == null) return null
  const str = String(val).trim()
  if (str === '' || str === 'null' || str === 'undefined') return null
  const num = Number(str)
  if (Number.isNaN(num)) return null
  return str
}

export function toText(val: unknown): string | null {
  if (val == null) return null
  const str = String(val).trim()
  return str === '' || str === 'null' || str === 'undefined' ? null : str
}

export async function seedBatch<T>(
  label: string,
  items: T[],
  fn: (item: T) => Promise<unknown>,
  identify: (item: T) => string,
  critical: boolean = false
): Promise<{ success: number; failed: SeedError[]; total: number }> {
  // allSettled lets one item fail without aborting the rest of the batch
  const results = await Promise.allSettled(
    items.map(async (item) => {
      try {
        await fn(item)
        return { success: true, item }
      } catch (err) {
        throw { item: identify(item), reason: err instanceof Error ? err.message : String(err) }
      }
    })
  )

  const failed: SeedError[] = []
  let successCount = 0

  for (const result of results) {
    if (result.status === 'fulfilled') successCount++
    else failed.push(result.reason as SeedError)
  }

  if (failed.length > 0) {
    console.error(`\n❌ ${failed.length}/${items.length} ${label} échoué(s) :`)
    failed.slice(0, 10).forEach((f, i) => console.error(`  ${i + 1}. [${f.item}] → ${f.reason}`))
    if (failed.length > 10) console.error(`  ... et ${failed.length - 10} autres erreurs.`)
    if (critical) throw new Error(`Seed interrompu : ${label} contient des erreurs critiques`)
  } else {
    console.log(`✅ ${successCount} ${label} créé(s)`)
  }

  return { success: successCount, failed, total: items.length }
}
