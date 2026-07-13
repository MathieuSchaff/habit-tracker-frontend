// Shared report helpers for one-shot CLI scripts (seed / audit / backfill / images).
// console.table writes to stdout only — never use these in linters that must exit 1.

/** Top-N entries of a frequency map, count desc, as `console.table`-ready rows. */
export function freqTable(freq: Map<string, number>, n: number, label: string) {
  return [...freq.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, n)
    .map(([value, count]) => ({ [label]: value, count }))
}
